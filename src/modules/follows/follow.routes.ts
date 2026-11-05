import { Router, Response } from "express";
import { requireAuth, AuthRequest } from "../../middleware/auth.middleware.js";
import { optionalAuth } from "../../platform/auth.js";
import { AppError } from "../../platform/errors.js";
import {
  serializeUserSummary,
  getAcademicLabel,
} from "../../platform/serializer.js";
import { buildPaginatedResponse, decodeCursor } from "../../platform/pagination.js";
import { routeParam } from "../../utils/routeParam.js";
import {
  ProfileModel,
  FollowModel,
  BlockModel,
  MediaAssetModel,
  OutboxEventModel,
} from "../../models/social.models.js";

const router = Router();

// PUT /api/v1/users/:id/follow
router.put("/users/:id/follow", requireAuth, async (req: AuthRequest, res: Response, next) => {
  try {
    const followerId = req.user!.sub;
    const rawParam = routeParam(req.params.id).replace(/^@/, "");

    const targetProfile = await ProfileModel.findOne({
      $or: [
        { userId: rawParam },
        { username: new RegExp(`^${rawParam}$`, "i") },
      ],
    });
    if (!targetProfile) {
      throw AppError.notFound("User not found", "USER_NOT_FOUND");
    }

    const followeeId = targetProfile.userId;
    if (followerId === followeeId) {
      throw AppError.badRequest("You cannot follow yourself", "CANNOT_FOLLOW_SELF");
    }

    const block = await BlockModel.findOne({
      $or: [
        { blockerId: followerId, blockedId: followeeId },
        { blockerId: followeeId, blockedId: followerId },
      ],
    }).lean();
    if (block) {
      throw AppError.forbidden("Cannot follow a blocked user", "USER_BLOCKED");
    }

    const initialStatus = targetProfile.visibility === "followers" ? "pending" : "accepted";

    const existing = await FollowModel.findOne({ followerId, followeeId });
    if (existing) {
      return res.json({
        following: existing.status === "accepted",
        status: existing.status,
        followersCount: targetProfile.followersCount,
      });
    }

    await FollowModel.create({
      followerId,
      followeeId,
      status: initialStatus,
    });

    if (initialStatus === "accepted") {
      await ProfileModel.updateOne(
        { userId: followerId },
        { $inc: { followingCount: 1 } }
      );
      targetProfile.followersCount = (targetProfile.followersCount || 0) + 1;
      await targetProfile.save();

      await OutboxEventModel.create({
        type: "follow.created",
        aggregateId: followeeId,
        payload: {
          actorId: followerId,
          recipientId: followeeId,
        },
      });

      return res.json({
        following: true,
        status: initialStatus,
        followersCount: targetProfile.followersCount,
      });
    }

    return res.json({
      following: false,
      status: initialStatus,
      followersCount: targetProfile.followersCount,
    });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/v1/users/:id/follow
router.delete("/users/:id/follow", requireAuth, async (req: AuthRequest, res: Response, next) => {
  try {
    const followerId = req.user!.sub;
    const rawParam = routeParam(req.params.id).replace(/^@/, "");
    const targetLookup = await ProfileModel.findOne({
      $or: [
        { userId: rawParam },
        { username: new RegExp(`^${rawParam}$`, "i") },
      ],
    }).lean();
    const followeeId = (targetLookup as any)?.userId || rawParam;

    const existing = await FollowModel.findOneAndDelete({ followerId, followeeId });
    if (!existing) {
      const target = await ProfileModel.findOne({ userId: followeeId }).lean();
      return res.json({ following: false, followersCount: (target as any)?.followersCount || 0 });
    }

    if (existing.status === "accepted") {
      await ProfileModel.updateOne(
        { userId: followerId },
        { $inc: { followingCount: -1 } }
      );

      const updated = await ProfileModel.findOneAndUpdate(
        { userId: followeeId },
        { $inc: { followersCount: -1 } },
        { new: true }
      ).lean();

      return res.json({
        following: false,
        status: "unfollowed",
        followersCount: Math.max(0, (updated as any)?.followersCount || 0),
      });
    }

    const currentTarget = await ProfileModel.findOne({ userId: followeeId }).lean();
    return res.json({
      following: false,
      status: "unfollowed",
      followersCount: (currentTarget as any)?.followersCount || 0,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/profiles/:username/followers
router.get("/profiles/:username/followers", optionalAuth, async (req: AuthRequest, res: Response, next) => {
  try {
    const rawUsername = routeParam(req.params.username);
    const cleanParam = rawUsername.replace(/^@/, "");
    const limit = Math.min(Number(req.query.limit) || 20, 50);
    const cursor = decodeCursor(req.query.cursor as string);
    const viewerId = req.user?.sub;

    const profile = await ProfileModel.findOne({
      $or: [
        { userId: cleanParam },
        { username: new RegExp(`^${cleanParam}$`, "i") },
      ],
    }).lean();
    if (!profile) throw AppError.notFound("Profile not found");

    const query: any = {
      followeeId: (profile as any).userId,
      status: "accepted",
    };

    if (cursor) {
      query.createdAt = { $lt: new Date(cursor.t) };
    }

    const follows = await FollowModel.find(query)
      .sort({ createdAt: -1 })
      .limit(limit + 1)
      .lean();

    const followerIds = follows.map((f: any) => f.followerId);
    let viewerFollowingSet = new Set<string>();
    if (viewerId) {
      const viewerFollows = await FollowModel.find({
        followerId: viewerId,
        followeeId: { $in: followerIds },
        status: "accepted",
      }).select("followeeId").lean();
      viewerFollowingSet = new Set(viewerFollows.map((vf: any) => vf.followeeId));
    }

    const followerProfiles = await ProfileModel.find({ userId: { $in: followerIds } }).lean();
    const avatarIds = followerProfiles
      .map((p: any) => p.avatarAssetId)
      .filter((id): id is string => Boolean(id));
    const avatars = await MediaAssetModel.find({
      $or: [{ _id: { $in: avatarIds } }, { id: { $in: avatarIds } }],
    }).lean();
    const avatarMap = new Map(avatars.map((a: any) => [a._id ? a._id.toString() : a.id, a]));
    const profileMap = new Map(followerProfiles.map((p: any) => [p.userId, p]));

    const response = buildPaginatedResponse(follows, limit, (item: any) => ({
      t: new Date(item.createdAt).toISOString(),
      id: item.followerId,
    }));

    return res.json({
      ...response,
      items: response.items.map((item: any) => {
        const follower = profileMap.get(item.followerId);
        return {
          ...serializeUserSummary(
            follower,
            follower?.avatarAssetId ? avatarMap.get(follower.avatarAssetId) : null
          ),
          isFollowing: viewerFollowingSet.has(item.followerId),
          fellowshipRole: follower?.fellowshipRole,
          academicLabel: getAcademicLabel(follower?.department, follower?.studyYear),
        };
      }),
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/profiles/:username/following
router.get("/profiles/:username/following", optionalAuth, async (req: AuthRequest, res: Response, next) => {
  try {
    const rawUsername = routeParam(req.params.username);
    const cleanParam = rawUsername.replace(/^@/, "");
    const limit = Math.min(Number(req.query.limit) || 20, 50);
    const cursor = decodeCursor(req.query.cursor as string);
    const viewerId = req.user?.sub;

    const profile = await ProfileModel.findOne({
      $or: [
        { userId: cleanParam },
        { username: new RegExp(`^${cleanParam}$`, "i") },
      ],
    }).lean();
    if (!profile) throw AppError.notFound("Profile not found");

    const query: any = {
      followerId: (profile as any).userId,
      status: "accepted",
    };

    if (cursor) {
      query.createdAt = { $lt: new Date(cursor.t) };
    }

    const follows = await FollowModel.find(query)
      .sort({ createdAt: -1 })
      .limit(limit + 1)
      .lean();

    const followeeIds = follows.map((f: any) => f.followeeId);
    let viewerFollowingSet = new Set<string>();
    if (viewerId) {
      const viewerFollows = await FollowModel.find({
        followerId: viewerId,
        followeeId: { $in: followeeIds },
        status: "accepted",
      }).select("followeeId").lean();
      viewerFollowingSet = new Set(viewerFollows.map((vf: any) => vf.followeeId));
    }

    const followeeProfiles = await ProfileModel.find({ userId: { $in: followeeIds } }).lean();
    const avatarIds = followeeProfiles
      .map((p: any) => p.avatarAssetId)
      .filter((id): id is string => Boolean(id));
    const avatars = await MediaAssetModel.find({
      $or: [{ _id: { $in: avatarIds } }, { id: { $in: avatarIds } }],
    }).lean();
    const avatarMap = new Map(avatars.map((a: any) => [a._id ? a._id.toString() : a.id, a]));
    const profileMap = new Map(followeeProfiles.map((p: any) => [p.userId, p]));

    const response = buildPaginatedResponse(follows, limit, (item: any) => ({
      t: new Date(item.createdAt).toISOString(),
      id: item.followeeId,
    }));

    return res.json({
      ...response,
      items: response.items.map((item: any) => {
        const followee = profileMap.get(item.followeeId);
        return {
          ...serializeUserSummary(
            followee,
            followee?.avatarAssetId ? avatarMap.get(followee.avatarAssetId) : null
          ),
          isFollowing: viewerFollowingSet.has(item.followeeId),
          fellowshipRole: followee?.fellowshipRole,
          academicLabel: getAcademicLabel(followee?.department, followee?.studyYear),
        };
      }),
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/profiles/:username/mutuals
router.get("/profiles/:username/mutuals", requireAuth, async (req: AuthRequest, res: Response, next) => {
  try {
    const viewerId = req.user!.sub;
    const rawUsername = routeParam(req.params.username);
    const cleanParam = rawUsername.replace(/^@/, "");

    const profile = await ProfileModel.findOne({
      $or: [
        { userId: cleanParam },
        { username: new RegExp(`^${cleanParam}$`, "i") },
      ],
    }).lean();
    if (!profile) throw AppError.notFound("Profile not found");

    const targetUserId = (profile as any).userId;

    // People target follows
    const targetFollowees = await FollowModel.find({ followerId: targetUserId, status: "accepted" }).select("followeeId").lean();
    const targetFolloweeIds = targetFollowees.map((tf: any) => tf.followeeId);

    // People viewer also follows among target's followees
    const viewerMutualFollows = await FollowModel.find({
      followerId: viewerId,
      followeeId: { $in: targetFolloweeIds },
      status: "accepted",
    }).limit(20).lean();
    const mutualUserIds = viewerMutualFollows.map((mf: any) => mf.followeeId);

    const mutualProfiles = await ProfileModel.find({ userId: { $in: mutualUserIds } }).lean();
    const avatarIds = mutualProfiles
      .map((p: any) => p.avatarAssetId)
      .filter((id): id is string => Boolean(id));
    const avatars = await MediaAssetModel.find({
      $or: [{ _id: { $in: avatarIds } }, { id: { $in: avatarIds } }],
    }).lean();
    const avatarMap = new Map(avatars.map((a: any) => [a._id ? a._id.toString() : a.id, a]));

    const items = mutualProfiles.map((p: any) =>
      serializeUserSummary(
        p,
        p.avatarAssetId ? avatarMap.get(p.avatarAssetId) : null
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
