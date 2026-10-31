import { Router, Response } from "express";
import { requireAuth, AuthRequest } from "../../middleware/auth.middleware.js";
import { optionalAuth } from "../../platform/auth.js";
import { prisma } from "../../utils/prisma.js";
import { AppError } from "../../platform/errors.js";
import {
  serializeMediaAsset,
  serializeUserSummary,
  getAcademicLabel,
  isUserOnline,
} from "../../platform/serializer.js";
import { buildPaginatedResponse, decodeCursor } from "../../platform/pagination.js";
import { routeParam } from "../../utils/routeParam.js";

const router = Router();

// PUT /api/v1/users/:id/follow
router.put("/users/:id/follow", requireAuth, async (req: AuthRequest, res: Response, next) => {
  try {
    const followerId = req.user!.sub;
    const followeeId = routeParam(req.params.id);

    if (followerId === followeeId) {
      throw AppError.badRequest("You cannot follow yourself", "CANNOT_FOLLOW_SELF");
    }

    const targetProfile = await prisma.profile.findUnique({
      where: { userId: followeeId },
    });
    if (!targetProfile) {
      throw AppError.notFound("User not found", "USER_NOT_FOUND");
    }

    // Check block
    const block = await prisma.block.findFirst({
      where: {
        OR: [
          { blockerId: followerId, blockedId: followeeId },
          { blockerId: followeeId, blockedId: followerId },
        ],
      },
    });
    if (block) {
      throw AppError.forbidden("Cannot follow a blocked user", "USER_BLOCKED");
    }

    const initialStatus = targetProfile.visibility === "followers" ? "pending" : "accepted";

    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.follow.findUnique({
        where: { followerId_followeeId: { followerId, followeeId } },
      });

      if (existing) {
        return {
          following: existing.status === "accepted",
          status: existing.status,
          followersCount: targetProfile.followersCount,
        };
      }

      await tx.follow.create({
        data: {
          followerId,
          followeeId,
          status: initialStatus,
        },
      });

      if (initialStatus === "accepted") {
        await tx.profile.update({
          where: { userId: followerId },
          data: { followingCount: { increment: 1 } },
        });

        const updatedTarget = await tx.profile.update({
          where: { userId: followeeId },
          data: { followersCount: { increment: 1 } },
        });

        // Outbox event for follow notification
        await tx.outboxEvent.create({
          data: {
            type: "follow.created",
            aggregateId: followeeId,
            payload: {
              actorId: followerId,
              recipientId: followeeId,
            },
          },
        });

        return {
          following: true,
          status: initialStatus,
          followersCount: updatedTarget.followersCount,
        };
      }

      return {
        following: false,
        status: initialStatus,
        followersCount: targetProfile.followersCount,
      };
    });

    return res.json(result);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/v1/users/:id/follow
router.delete("/users/:id/follow", requireAuth, async (req: AuthRequest, res: Response, next) => {
  try {
    const followerId = req.user!.sub;
    const followeeId = routeParam(req.params.id);

    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.follow.findUnique({
        where: { followerId_followeeId: { followerId, followeeId } },
      });

      if (!existing) {
        const target = await tx.profile.findUnique({ where: { userId: followeeId } });
        return { following: false, followersCount: target?.followersCount || 0 };
      }

      await tx.follow.delete({
        where: { followerId_followeeId: { followerId, followeeId } },
      });

      if (existing.status === "accepted") {
        await tx.profile.update({
          where: { userId: followerId },
          data: { followingCount: { decrement: 1 } },
        });

        const updatedTarget = await tx.profile.update({
          where: { userId: followeeId },
          data: { followersCount: { decrement: 1 } },
        });

        return {
          following: false,
          status: "none",
          followersCount: Math.max(0, updatedTarget.followersCount),
        };
      }

      const target = await tx.profile.findUnique({ where: { userId: followeeId } });
      return { following: false, status: "none", followersCount: target?.followersCount || 0 };
    });

    return res.json(result);
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/suggestions/users
router.get("/suggestions/users", requireAuth, async (req: AuthRequest, res: Response, next) => {
  try {
    const viewerId = req.user!.sub;
    const limit = Math.min(Number(req.query.limit) || 10, 50);

    const viewer = await prisma.profile.findUnique({
      where: { userId: viewerId },
      include: {
        ministryMemberships: true,
        following: { select: { followeeId: true } },
        blocks: { select: { blockedId: true } },
        blockedBy: { select: { blockerId: true } },
        mutes: { select: { mutedId: true } },
        followDismissals: { select: { dismissedId: true } },
      },
    });

    if (!viewer) {
      return res.json({ items: [], nextCursor: null, hasMore: false });
    }

    const excludedIds = new Set<string>([
      viewerId,
      ...viewer.following.map((f) => f.followeeId),
      ...viewer.blocks.map((b) => b.blockedId),
      ...viewer.blockedBy.map((b) => b.blockerId),
      ...viewer.mutes.map((m) => m.mutedId),
      ...viewer.followDismissals.map((d) => d.dismissedId),
    ]);

    const candidates = await prisma.profile.findMany({
      where: {
        userId: { notIn: Array.from(excludedIds) },
      },
      include: {
        ministryMemberships: { include: { ministry: true } },
        followers: {
          where: {
            followerId: { in: viewer.following.map((f) => f.followeeId) },
            status: "accepted",
          },
        },
      },
      take: 40,
    });

    const viewerMinistryIds = new Set(viewer.ministryMemberships.map((m) => m.ministryId));

    // Score and rank candidates
    const scored = candidates.map((candidate) => {
      let score = 0;
      let reason: "mutual" | "ministry" | "department" | "popular" = "popular";

      const mutualCount = candidate.followers.length;
      if (mutualCount > 0) {
        score += mutualCount * 3;
        reason = "mutual";
      }

      const hasSameMinistry = candidate.ministryMemberships.some((m) =>
        viewerMinistryIds.has(m.ministryId)
      );
      if (hasSameMinistry) {
        score += 2;
        if (mutualCount === 0) reason = "ministry";
      }

      if (viewer.department && candidate.department === viewer.department) {
        score += 1;
        if (mutualCount === 0 && !hasSameMinistry) reason = "department";
      }

      if (viewer.studyYear && candidate.studyYear === viewer.studyYear) {
        score += 1;
      }

      score += Math.min(candidate.followersCount / 10, 5);

      return {
        candidate,
        score,
        mutualCount,
        reason,
      };
    });

    scored.sort((a, b) => b.score - a.score);

    const topList = scored.slice(0, limit);

    // Hydrate avatars
    const avatarIds = topList
      .map((item) => item.candidate.avatarAssetId)
      .filter((id): id is string => Boolean(id));
    const avatars = await prisma.mediaAsset.findMany({
      where: { id: { in: avatarIds } },
    });
    const avatarMap = new Map(avatars.map((a) => [a.id, a]));

    const items = topList.map(({ candidate, mutualCount, reason }) => {
      const summary = serializeUserSummary(
        candidate,
        candidate.avatarAssetId ? avatarMap.get(candidate.avatarAssetId) : null
      );
      return {
        ...summary,
        fellowshipRole: candidate.fellowshipRole || null,
        academicLabel: getAcademicLabel(candidate.department, candidate.studyYear) || null,
        mutualCount,
        reason,
        presence: candidate.showPresence
          ? {
              online: isUserOnline(candidate.lastSeenAt, candidate.showPresence),
            }
          : null,
      };
    });

    return res.json({
      items,
      nextCursor: null,
      hasMore: false,
    });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/v1/suggestions/users/:id (dismiss button)
router.delete("/suggestions/users/:id", requireAuth, async (req: AuthRequest, res: Response, next) => {
  try {
    const userId = req.user!.sub;
    const dismissedId = routeParam(req.params.id);

    await prisma.followDismissal.upsert({
      where: { userId_dismissedId: { userId, dismissedId } },
      create: { userId, dismissedId },
      update: {},
    });

    return res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/profiles/:username/followers
router.get("/profiles/:username/followers", optionalAuth, async (req: AuthRequest, res: Response, next) => {
  try {
    const username = routeParam(req.params.username);
    const limit = Math.min(Number(req.query.limit) || 20, 50);
    const cursor = decodeCursor(req.query.cursor as string);
    const viewerId = req.user?.sub;

    const profile = await prisma.profile.findFirst({
      where: { username: { equals: username, mode: "insensitive" } },
    });
    if (!profile) throw AppError.notFound("Profile not found");

    const where: any = {
      followeeId: profile.userId,
      status: "accepted",
    };

    if (cursor) {
      where.createdAt = { lt: new Date(cursor.t) };
    }

    const follows = await prisma.follow.findMany({
      where,
      include: {
        follower: true,
      },
      orderBy: [{ createdAt: "desc" }, { followerId: "desc" }],
      take: limit + 1,
    });

    const followerIds = follows.map((f) => f.follower.userId);
    let viewerFollowingSet = new Set<string>();
    if (viewerId) {
      const viewerFollows = await prisma.follow.findMany({
        where: {
          followerId: viewerId,
          followeeId: { in: followerIds },
          status: "accepted",
        },
      });
      viewerFollowingSet = new Set(viewerFollows.map((vf) => vf.followeeId));
    }

    const avatarIds = follows
      .map((f) => f.follower.avatarAssetId)
      .filter((id): id is string => Boolean(id));
    const avatars = await prisma.mediaAsset.findMany({ where: { id: { in: avatarIds } } });
    const avatarMap = new Map(avatars.map((a) => [a.id, a]));

    const response = buildPaginatedResponse(follows, limit, (item) => ({
      t: item.createdAt.toISOString(),
      id: item.followerId,
    }));

    return res.json({
      ...response,
      items: response.items.map((item) => ({
        ...serializeUserSummary(
          item.follower,
          item.follower.avatarAssetId ? avatarMap.get(item.follower.avatarAssetId) : null
        ),
        isFollowing: viewerFollowingSet.has(item.follower.userId),
        fellowshipRole: item.follower.fellowshipRole,
        academicLabel: getAcademicLabel(item.follower.department, item.follower.studyYear),
      })),
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/profiles/:username/following
router.get("/profiles/:username/following", optionalAuth, async (req: AuthRequest, res: Response, next) => {
  try {
    const username = routeParam(req.params.username);
    const limit = Math.min(Number(req.query.limit) || 20, 50);
    const cursor = decodeCursor(req.query.cursor as string);
    const viewerId = req.user?.sub;

    const profile = await prisma.profile.findFirst({
      where: { username: { equals: username, mode: "insensitive" } },
    });
    if (!profile) throw AppError.notFound("Profile not found");

    const where: any = {
      followerId: profile.userId,
      status: "accepted",
    };

    if (cursor) {
      where.createdAt = { lt: new Date(cursor.t) };
    }

    const follows = await prisma.follow.findMany({
      where,
      include: {
        followee: true,
      },
      orderBy: [{ createdAt: "desc" }, { followeeId: "desc" }],
      take: limit + 1,
    });

    const followeeIds = follows.map((f) => f.followee.userId);
    let viewerFollowingSet = new Set<string>();
    if (viewerId) {
      const viewerFollows = await prisma.follow.findMany({
        where: {
          followerId: viewerId,
          followeeId: { in: followeeIds },
          status: "accepted",
        },
      });
      viewerFollowingSet = new Set(viewerFollows.map((vf) => vf.followeeId));
    }

    const avatarIds = follows
      .map((f) => f.followee.avatarAssetId)
      .filter((id): id is string => Boolean(id));
    const avatars = await prisma.mediaAsset.findMany({ where: { id: { in: avatarIds } } });
    const avatarMap = new Map(avatars.map((a) => [a.id, a]));

    const response = buildPaginatedResponse(follows, limit, (item) => ({
      t: item.createdAt.toISOString(),
      id: item.followeeId,
    }));

    return res.json({
      ...response,
      items: response.items.map((item) => ({
        ...serializeUserSummary(
          item.followee,
          item.followee.avatarAssetId ? avatarMap.get(item.followee.avatarAssetId) : null
        ),
        isFollowing: viewerFollowingSet.has(item.followee.userId),
        fellowshipRole: item.followee.fellowshipRole,
        academicLabel: getAcademicLabel(item.followee.department, item.followee.studyYear),
      })),
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/profiles/:username/mutuals
router.get("/profiles/:username/mutuals", requireAuth, async (req: AuthRequest, res: Response, next) => {
  try {
    const viewerId = req.user!.sub;
    const username = routeParam(req.params.username);

    const profile = await prisma.profile.findFirst({
      where: { username: { equals: username, mode: "insensitive" } },
    });
    if (!profile) throw AppError.notFound("Profile not found");

    const mutualFollows = await prisma.follow.findMany({
      where: {
        followeeId: profile.userId,
        status: "accepted",
        follower: {
          followers: {
            some: {
              followerId: viewerId,
              status: "accepted",
            },
          },
        },
      },
      include: {
        follower: true,
      },
      take: 20,
    });

    const avatarIds = mutualFollows
      .map((f) => f.follower.avatarAssetId)
      .filter((id): id is string => Boolean(id));
    const avatars = await prisma.mediaAsset.findMany({ where: { id: { in: avatarIds } } });
    const avatarMap = new Map(avatars.map((a) => [a.id, a]));

    const items = mutualFollows.map((f) =>
      serializeUserSummary(
        f.follower,
        f.follower.avatarAssetId ? avatarMap.get(f.follower.avatarAssetId) : null
      )
    );

    return res.json({
      items,
      total: items.length,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
