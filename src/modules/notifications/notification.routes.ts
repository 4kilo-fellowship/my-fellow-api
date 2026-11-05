import { Router, Response } from "express";
import { requireAuth, AuthRequest } from "../../middleware/auth.middleware.js";
import { AppError } from "../../platform/errors.js";
import { serializeUserSummary } from "../../platform/serializer.js";
import { buildPaginatedResponse, decodeCursor } from "../../platform/pagination.js";
import {
  NotificationModel,
  PushDeviceModel,
  ProfileModel,
  MediaAssetModel,
} from "../../models/social.models.js";

const router = Router();

// GET /api/v1/notifications
router.get("/notifications", requireAuth, async (req: AuthRequest, res: Response, next) => {
  try {
    const recipientId = req.user!.sub;
    const limit = Math.min(Number(req.query.limit) || 20, 50);
    const cursor = decodeCursor(req.query.cursor as string);

    const query: any = { recipientId };
    if (cursor) {
      query.updatedAt = { $lt: new Date(cursor.t) };
    }

    const notifications = await NotificationModel.find(query)
      .sort({ updatedAt: -1 })
      .limit(limit + 1)
      .lean();

    const paginated = buildPaginatedResponse(notifications, limit, (item: any) => ({
      t: new Date(item.updatedAt).toISOString(),
      id: item._id.toString(),
    }));

    // Collect all actor IDs across notifications
    const allActorIds = Array.from(
      new Set(paginated.items.flatMap((n: any) => n.actorIds || []))
    );

    const actors = await ProfileModel.find({ userId: { $in: allActorIds } }).lean();
    const actorAvatarIds = actors
      .map((a: any) => a.avatarAssetId)
      .filter((id): id is string => Boolean(id));
    const avatars = await MediaAssetModel.find({
      $or: [{ _id: { $in: actorAvatarIds } }, { id: { $in: actorAvatarIds } }],
    }).lean();
    const avatarMap = new Map(avatars.map((a: any) => [a._id ? a._id.toString() : a.id, a]));

    const actorMap = new Map(
      actors.map((a: any) => [
        a.userId,
        serializeUserSummary(a, a.avatarAssetId ? avatarMap.get(a.avatarAssetId) : null),
      ])
    );

    const items = paginated.items.map((n: any) => {
      const hydratedActors = (n.actorIds || [])
        .map((id: string) => actorMap.get(id))
        .filter(Boolean);

      return {
        id: n._id.toString(),
        type: n.type,
        groupKey: n.groupKey,
        actors: hydratedActors,
        actorCount: n.actorCount,
        entityType: n.entityType,
        entityId: n.entityId,
        data: n.data,
        read: Boolean(n.readAt),
        readAt: n.readAt ? new Date(n.readAt).toISOString() : null,
        createdAt: new Date(n.createdAt).toISOString(),
        updatedAt: new Date(n.updatedAt).toISOString(),
      };
    });

    return res.json({
      items,
      nextCursor: paginated.nextCursor,
      hasMore: paginated.hasMore,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/notifications/unread-count
router.get("/notifications/unread-count", requireAuth, async (req: AuthRequest, res: Response, next) => {
  try {
    const recipientId = req.user!.sub;
    const unreadCount = await NotificationModel.countDocuments({
      recipientId,
      readAt: null,
    });

    return res.json({ unreadCount });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/notifications/read
router.post("/notifications/read", requireAuth, async (req: AuthRequest, res: Response, next) => {
  try {
    const recipientId = req.user!.sub;
    const { ids, all } = req.body;

    const now = new Date();

    if (all === true) {
      const result = await NotificationModel.updateMany(
        { recipientId, readAt: null },
        { $set: { readAt: now } }
      );
      return res.json({ success: true, updatedCount: result.modifiedCount });
    }

    if (Array.isArray(ids) && ids.length > 0) {
      const result = await NotificationModel.updateMany(
        { _id: { $in: ids }, recipientId, readAt: null },
        { $set: { readAt: now } }
      );
      return res.json({ success: true, updatedCount: result.modifiedCount });
    }

    return res.json({ success: true, updatedCount: 0 });
  } catch (err) {
    next(err);
  }
});

// PUT /api/v1/me/push-devices
router.put("/me/push-devices", requireAuth, async (req: AuthRequest, res: Response, next) => {
  try {
    const userId = req.user!.sub;
    const { expoPushToken, platform, appVersion, locale } = req.body;

    if (!expoPushToken || typeof expoPushToken !== "string") {
      throw AppError.badRequest("expoPushToken is required", "INVALID_PUSH_TOKEN");
    }

    const device = await PushDeviceModel.findOneAndUpdate(
      { expoPushToken },
      {
        $set: {
          userId,
          expoPushToken,
          platform: platform || "unknown",
          appVersion: appVersion || null,
          locale: locale || "en",
          lastSeenAt: new Date(),
          disabledAt: null,
        },
      },
      { upsert: true, new: true }
    );

    return res.json({ success: true, deviceId: device._id.toString() });
  } catch (err) {
    next(err);
  }
});

export default router;
