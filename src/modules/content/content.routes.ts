import { Router, Response } from "express";
import { z } from "zod";
import { prisma } from "../../utils/prisma.js";
import { serializeMediaAsset } from "../../platform/serializer.js";
import { buildPaginatedResponse, decodeCursor } from "../../platform/pagination.js";
import { requireAuth, requirePermission, AuthRequest } from "../../middleware/auth.middleware.js";
import { uploadVideoFiles } from "../../middleware/upload.middleware.js";
import {
  getVideoThumbnailUrl,
  uploadFileToCloudinary,
  uploadImageToCloudinary,
} from "../../services/cloudinary.service.js";

const router = Router();

const createVideoSchema = z.object({
  title: z.string().trim().min(3).max(120),
  description: z.string().trim().max(1000).optional().default(""),
});

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
        videoUrl: v.playbackUrl,
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

router.post(
  "/content/videos",
  requireAuth,
  requirePermission("sermons.media.manage"),
  uploadVideoFiles,
  async (req: AuthRequest, res: Response, next) => {
    try {
      const parsed = createVideoSchema.safeParse(req.body);
      const files = req.files as
        | { video?: Express.Multer.File[]; thumbnail?: Express.Multer.File[] }
        | undefined;
      const video = files?.video?.[0];
      const thumbnail = files?.thumbnail?.[0];

      if (!parsed.success || !video) {
        return res.status(400).json({
          success: false,
          message: "Title and a video file are required",
          errors: parsed.success ? undefined : parsed.error.flatten(),
        });
      }

      const videoUpload = await uploadFileToCloudinary(video.buffer, {
        folder: "my-fellow/videos",
        resource_type: "video",
      });
      const thumbnailUpload = thumbnail
        ? await uploadImageToCloudinary(thumbnail.buffer, {
            folder: "my-fellow/video-thumbnails",
          })
        : null;

      const item = await prisma.contentItem.create({
        data: {
          kind: "video",
          createdBy: req.user!.sub,
          title: parsed.data.title,
          description: parsed.data.description,
          thumbnailUrl:
            thumbnailUpload?.secure_url ||
            getVideoThumbnailUrl(videoUpload.public_id),
          playbackUrl: videoUpload.secure_url,
          provider: "cloudinary",
          providerRef: videoUpload.public_id,
          status: "published",
          publishedAt: new Date(),
        },
      });

      return res.status(201).json({
        success: true,
        data: {
          id: item.id,
          title: item.title,
          description: item.description,
          thumbnail: item.thumbnailUrl,
          playbackUrl: item.playbackUrl,
          publishedAt: item.publishedAt.toISOString(),
        },
      });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
