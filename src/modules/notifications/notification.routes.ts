import { Router, Response } from "express";
import { requireAuth, AuthRequest } from "../../middleware/auth.middleware.js";
import { prisma } from "../../utils/prisma.js";
import { AppError } from "../../platform/errors.js";
import { serializeUserSummary } from "../../platform/serializer.js";
import { buildPaginatedResponse, decodeCursor } from "../../platform/pagination.js";

const router = Router();

// GET /api/v1/notifications
router.get("/notifications", requireAuth, async (req: AuthRequest, res: Response, next) => {
  try {
    const recipientId = req.user!.sub;
    const limit = Math.min(Number(req.query.limit) || 20, 50);
    const cursor = decodeCursor(req.query.cursor as string);

    const where: any = { recipientId };
    if (cursor) {
      where.updatedAt = { lt: new Date(cursor.t) };
    }

    const notifications = await prisma.notification.findMany({
      where,
      orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
      take: limit + 1,
    });

    const paginated = buildPaginatedResponse(notifications, limit, (item) => ({
      t: item.updatedAt.toISOString(),
      id: item.id,
    }));

    // Collect all actor IDs across notifications
    const allActorIds = Array.from(
      new Set(paginated.items.flatMap((n) => n.actorIds))
    );

    const actors = await prisma.profile.findMany({
      where: { userId: { in: allActorIds } },
    });
    const actorAvatarIds = actors
      .map((a) => a.avatarAssetId)
      .filter((id): id is string => Boolean(id));
    const avatars = await prisma.mediaAsset.findMany({ where: { id: { in: actorAvatarIds } } });
    const avatarMap = new Map(avatars.map((a) => [a.id, a]));

    const actorMap = new Map(
      actors.map((a) => [
        a.userId,
        serializeUserSummary(a, a.avatarAssetId ? avatarMap.get(a.avatarAssetId) : null),
      ])
    );

    const items = paginated.items.map((n) => {
      const hydratedActors = n.actorIds
        .map((id) => actorMap.get(id))
        .filter(Boolean);

      return {
        id: n.id,
        type: n.type,
        groupKey: n.groupKey,
        actors: hydratedActors,
        actorCount: n.actorCount,
        entityType: n.entityType,
        entityId: n.entityId,
        data: n.data,
        read: Boolean(n.readAt),
        readAt: n.readAt?.toISOString() || null,
        createdAt: n.createdAt.toISOString(),
        updatedAt: n.updatedAt.toISOString(),
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
    const unreadCount = await prisma.notification.count({
      where: {
        recipientId,
        readAt: null,
      },
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
      const result = await prisma.notification.updateMany({
        where: { recipientId, readAt: null },
        data: { readAt: now },
      });
      return res.json({ success: true, updatedCount: result.count });
    }

    if (Array.isArray(ids) && ids.length > 0) {
      const result = await prisma.notification.updateMany({
        where: {
          id: { in: ids },
          recipientId,
          readAt: null,
        },
        data: { readAt: now },
      });
      return res.json({ success: true, updatedCount: result.count });
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

    const device = await prisma.pushDevice.upsert({
      where: { expoPushToken },
      create: {
        userId,
        expoPushToken,
        platform: platform || "unknown",
        appVersion: appVersion || null,
        locale: locale || "en",
        lastSeenAt: new Date(),
      },
      update: {
        userId, // reassign token if changed user
        platform: platform || undefined,
        appVersion: appVersion || undefined,
        locale: locale || undefined,
        lastSeenAt: new Date(),
        disabledAt: null,
      },
    });

    return res.json({ success: true, deviceId: device.id });
  } catch (err) {
    next(err);
  }
});

export default router;
