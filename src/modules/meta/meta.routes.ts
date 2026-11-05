import { Router, Response } from "express";
import { optionalAuth } from "../../platform/auth.js";
import { AuthRequest } from "../../middleware/auth.middleware.js";
import { serializeMediaAsset, serializeUserSummary } from "../../platform/serializer.js";
import {
  ProfileModel,
  MediaAssetModel,
  NotificationModel,
} from "../../models/social.models.js";
import { UserModel } from "../../models/user.model.js";

const router = Router();

// GET /api/v1/meta/me
router.get("/meta/me", optionalAuth, async (req: AuthRequest, res: Response, next) => {
  try {
    const viewerId = req.user?.sub;

    if (!viewerId) {
      return res.json({
        user: null,
        unreadNotificationsCount: 0,
        unreadMessagesCount: 0,
        serverTime: new Date().toISOString(),
      });
    }

    let profile = await ProfileModel.findOne({ userId: viewerId }).lean();

    if (!profile) {
      const user = await UserModel.findById(viewerId).lean();
      const displayName = (user as any)?.fullName || "Fellowship Member";
      const baseUsername = ((user as any)?.telegramUserName || (user as any)?.fullName || "fellow")
        .toLowerCase()
        .replace(/[^a-z0-9_]/g, "");

      const created = await ProfileModel.create({
        userId: viewerId,
        username: `${baseUsername}_${viewerId.slice(-4)}`,
        displayName,
        fellowshipRole: (user as any)?.role || "member",
        visibility: "public",
      });
      profile = created.toJSON();
    }

    const unreadNotificationsCount = await NotificationModel.countDocuments({
      recipientId: viewerId,
      readAt: null,
    });

    let avatarAsset = null;
    let coverAsset = null;

    if ((profile as any).avatarAssetId) {
      avatarAsset = await MediaAssetModel.findOne({
        $or: [{ _id: (profile as any).avatarAssetId }, { id: (profile as any).avatarAssetId }],
      }).lean();
    }

    if ((profile as any).coverAssetId) {
      coverAsset = await MediaAssetModel.findOne({
        $or: [{ _id: (profile as any).coverAssetId }, { id: (profile as any).coverAssetId }],
      }).lean();
    }

    return res.json({
      user: {
        ...serializeUserSummary(profile, avatarAsset),
        cover: serializeMediaAsset(coverAsset),
        bio: (profile as any).bio,
        location: (profile as any).location,
        followersCount: (profile as any).followersCount || 0,
        followingCount: (profile as any).followingCount || 0,
        postsCount: (profile as any).postsCount || 0,
      },
      unreadNotificationsCount,
      unreadMessagesCount: 0,
      serverTime: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
});

export default router;
