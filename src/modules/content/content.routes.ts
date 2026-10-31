import { Router, Response } from "express";
import { prisma } from "../../utils/prisma.js";
import { serializeMediaAsset } from "../../platform/serializer.js";
import { buildPaginatedResponse, decodeCursor } from "../../platform/pagination.js";

const router = Router();

// GET /api/v1/content/videos
router.get("/content/videos", async (req, res: Response, next) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 10, 50);
    const cursor = decodeCursor(req.query.cursor as string);

    const where: any = {
      status: "published",
      kind: "video",
    };

    if (cursor) {
      where.publishedAt = { lt: new Date(cursor.t) };
    }

    const videos = await prisma.contentItem.findMany({
      where,
      orderBy: [{ publishedAt: "desc" }, { id: "desc" }],
      take: limit + 1,
    });

    const paginated = buildPaginatedResponse(videos, limit, (item) => ({
      t: item.publishedAt.toISOString(),
      id: item.id,
    }));

    const thumbnailAssetIds = paginated.items
      .map((v) => v.thumbnailAssetId)
      .filter((id): id is string => Boolean(id));
    const assets = await prisma.mediaAsset.findMany({
      where: { id: { in: thumbnailAssetIds } },
    });
    const assetMap = new Map(assets.map((a) => [a.id, a]));

    const items = paginated.items.map((v) => {
      let thumbnail = null;
      if (v.thumbnailAssetId && assetMap.has(v.thumbnailAssetId)) {
        thumbnail = serializeMediaAsset(assetMap.get(v.thumbnailAssetId));
      } else if (v.thumbnailUrl) {
        thumbnail = {
          id: `thumb-${v.id}`,
          kind: "image" as const,
          width: 1280,
          height: 720,
          urls: {
            sm: v.thumbnailUrl,
            md: v.thumbnailUrl,
            lg: v.thumbnailUrl,
            original: v.thumbnailUrl,
          },
        };
      }

      return {
        id: v.id,
        kind: v.kind,
        title: v.title,
        description: v.description,
        durationSeconds: v.durationSeconds || 0,
        thumbnail,
        playbackUrl: v.playbackUrl,
        publishedAt: v.publishedAt.toISOString(),
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

export default router;
