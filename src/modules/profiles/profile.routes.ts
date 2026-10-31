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
import { ProfileDetail, UserSummary } from "../../platform/types.js";
import { routeParam } from "../../utils/routeParam.js";

const router = Router();

// GET /api/v1/profiles/:username
router.get("/profiles/:username", optionalAuth, async (req: AuthRequest, res: Response, next) => {
  try {
    const username = routeParam(req.params.username);
    const viewerId = req.user?.sub;

    const profile = await prisma.profile.findFirst({
      where: {
        username: {
          equals: username,
          mode: "insensitive",
        },
      },
      include: {
        links: { orderBy: { position: "asc" } },
        streak: true,
        ministryMemberships: {
          include: { ministry: true },
        },
        highlights: {
          orderBy: { position: "asc" },
        },
      },
    });

    if (!profile) {
      throw AppError.notFound("Profile not found", "PROFILE_NOT_FOUND");
    }

    const targetUserId = profile.userId;
    const isSelf = viewerId === targetUserId;

    // Check blocks
    let blocked = false;
    let blockedBy = false;
    let muted = false;
    let following = false;
    let followedBy = false;
    let pendingRequest = false;

    if (viewerId && !isSelf) {
      const [blockRecord, blockedByRecord, muteRecord, followRecord, reverseFollowRecord] =
        await Promise.all([
          prisma.block.findUnique({
            where: { blockerId_blockedId: { blockerId: viewerId, blockedId: targetUserId } },
          }),
          prisma.block.findUnique({
            where: { blockerId_blockedId: { blockerId: targetUserId, blockedId: viewerId } },
          }),
          prisma.mute.findUnique({
            where: { muterId_mutedId: { muterId: viewerId, mutedId: targetUserId } },
          }),
          prisma.follow.findUnique({
            where: { followerId_followeeId: { followerId: viewerId, followeeId: targetUserId } },
          }),
          prisma.follow.findUnique({
            where: { followerId_followeeId: { followerId: targetUserId, followeeId: viewerId } },
          }),
        ]);

      blocked = !!blockRecord;
      blockedBy = !!blockedByRecord;
      muted = !!muteRecord;

      if (followRecord) {
        if (followRecord.status === "accepted") {
          following = true;
        } else {
          pendingRequest = true;
        }
      }

      followedBy = !!reverseFollowRecord && reverseFollowRecord.status === "accepted";

      // Symmetric privacy: if blockedBy, treat as 404 to avoid confirming existence
      if (blockedBy) {
        throw AppError.notFound("Profile not found", "PROFILE_NOT_FOUND");
      }
    }

    // Load assets
    let avatarAsset = null;
    if (profile.avatarAssetId) {
      avatarAsset = await prisma.mediaAsset.findUnique({ where: { id: profile.avatarAssetId } });
    }

    let coverAsset = null;
    if (profile.coverAssetId) {
      coverAsset = await prisma.mediaAsset.findUnique({ where: { id: profile.coverAssetId } });
    }

    // Followed by preview (mutuals): users viewer follows who also follow target profile
    let followedByPreview: { total: number; users: UserSummary[] } = { total: 0, users: [] };
    if (viewerId && !isSelf) {
      const mutualFollows = await prisma.follow.findMany({
        where: {
          followeeId: targetUserId,
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
        take: 3,
      });

      const totalMutuals = await prisma.follow.count({
        where: {
          followeeId: targetUserId,
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
      });

      const mutualAvatarIds = mutualFollows
        .map((f) => f.follower.avatarAssetId)
        .filter((id): id is string => Boolean(id));

      const avatarAssets = await prisma.mediaAsset.findMany({
        where: { id: { in: mutualAvatarIds } },
      });
      const avatarMap = new Map(avatarAssets.map((a) => [a.id, a]));

      followedByPreview = {
        total: totalMutuals,
        users: mutualFollows.map((f) =>
          serializeUserSummary(
            f.follower,
            f.follower.avatarAssetId ? avatarMap.get(f.follower.avatarAssetId) : null
          )
        ),
      };
    }

    // Story Highlights
    const highlightCoverIds = profile.highlights
      .map((h) => h.coverAssetId)
      .filter((id): id is string => Boolean(id));
    const highlightCovers = await prisma.mediaAsset.findMany({
      where: { id: { in: highlightCoverIds } },
    });
    const coverMap = new Map(highlightCovers.map((c) => [c.id, c]));

    const highlights = profile.highlights.map((h) => ({
      id: h.id,
      title: h.title,
      emoji: h.emoji || undefined,
      cover: h.coverAssetId ? serializeMediaAsset(coverMap.get(h.coverAssetId)) : null,
    }));

    // Badges row
    const badges: { kind: "ministry" | "academic" | "streak" | "role"; label: string }[] = [];
    if (profile.ministryMemberships?.[0]?.ministry) {
      badges.push({ kind: "ministry", label: profile.ministryMemberships[0].ministry.name });
    }
    const acadLabel = getAcademicLabel(profile.department, profile.studyYear);
    if (acadLabel) {
      badges.push({ kind: "academic", label: acadLabel });
    }
    if (profile.streak && profile.streak.current > 0) {
      badges.push({ kind: "streak", label: `${profile.streak.current}d Streak` });
    }
    if (profile.fellowshipRole) {
      badges.push({ kind: "role", label: profile.fellowshipRole });
    }

    const detail: ProfileDetail = {
      ...serializeUserSummary(profile, avatarAsset),
      cover: serializeMediaAsset(coverAsset),
      bio: profile.bio,
      location: profile.location,
      joinedAt: profile.createdAt.toISOString(),
      links: profile.links.map((l) => ({ kind: l.kind, handle: l.handle || undefined, url: l.url })),
      academic: {
        department: profile.department || undefined,
        studyYear: profile.studyYear || undefined,
        label: acadLabel,
      },
      badges,
      streak: profile.streak ? { current: profile.streak.current } : null,
      counts: {
        following: profile.followingCount,
        connects: profile.followersCount,
        reflections: profile.postsCount,
      },
      presence: profile.showPresence
        ? {
            online: isUserOnline(profile.lastSeenAt, profile.showPresence),
            lastSeenAt: profile.lastSeenAt?.toISOString() || null,
          }
        : null,
      viewer: {
        isSelf,
        following,
        followedBy,
        pendingRequest,
        blocked,
        blockedBy,
        muted,
      },
      followedByPreview,
      highlights,
    };

    return res.json(detail);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/v1/me/profile
router.patch("/me/profile", requireAuth, async (req: AuthRequest, res: Response, next) => {
  try {
    const userId = req.user!.sub;
    const {
      displayName,
      bio,
      location,
      department,
      studyYear,
      fellowshipRole,
      showPresence,
      visibility,
      avatarAssetId,
      coverAssetId,
      links,
    } = req.body;

    const data: any = {};
    if (displayName !== undefined) data.displayName = String(displayName).trim().slice(0, 60);
    if (bio !== undefined) data.bio = String(bio).trim().slice(0, 300);
    if (location !== undefined) data.location = String(location).trim().slice(0, 80);
    if (department !== undefined) data.department = String(department).trim();
    if (studyYear !== undefined) data.studyYear = Number(studyYear);
    if (fellowshipRole !== undefined) data.fellowshipRole = String(fellowshipRole).trim();
    if (showPresence !== undefined) data.showPresence = Boolean(showPresence);
    if (visibility !== undefined && ["public", "followers"].includes(visibility)) {
      data.visibility = visibility;
    }
    if (avatarAssetId !== undefined) data.avatarAssetId = avatarAssetId;
    if (coverAssetId !== undefined) data.coverAssetId = coverAssetId;

    const updated = await prisma.profile.update({
      where: { userId },
      data,
    });

    // Update links if provided
    if (Array.isArray(links)) {
      await prisma.profileLink.deleteMany({ where: { userId } });
      if (links.length > 0) {
        await prisma.profileLink.createMany({
          data: links.map((link: any, index: number) => ({
            userId,
            kind: link.kind || "website",
            handle: link.handle || null,
            url: link.url || "",
            position: index,
          })),
        });
      }
    }

    return res.json({ success: true, profile: updated });
  } catch (err) {
    next(err);
  }
});

// PUT /api/v1/me/username
router.put("/me/username", requireAuth, async (req: AuthRequest, res: Response, next) => {
  try {
    const userId = req.user!.sub;
    const { username } = req.body;

    if (!username || typeof username !== "string") {
      throw AppError.badRequest("Username is required", "INVALID_USERNAME");
    }

    const cleanUsername = username.trim().toLowerCase();
    if (!/^[a-z0-9_]{3,20}$/.test(cleanUsername)) {
      throw AppError.badRequest(
        "Username must be 3-20 lowercase alphanumeric characters or underscores",
        "INVALID_USERNAME_FORMAT"
      );
    }

    const existing = await prisma.profile.findUnique({
      where: { username: cleanUsername },
    });

    if (existing && existing.userId !== userId) {
      throw AppError.conflict("Username is already taken", "USERNAME_TAKEN");
    }

    const updated = await prisma.profile.update({
      where: { userId },
      data: {
        username: cleanUsername,
        usernameChangedAt: new Date(),
      },
    });

    return res.json({ success: true, username: updated.username });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/me/presence
router.post("/me/presence", requireAuth, async (req: AuthRequest, res: Response, next) => {
  try {
    const userId = req.user!.sub;
    await prisma.profile.update({
      where: { userId },
      data: { lastSeenAt: new Date() },
    });
    return res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

export default router;
