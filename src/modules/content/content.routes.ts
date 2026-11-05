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

const CURATED_DEFAULT_VIDEOS = [
  {
    id: "living-hope",
    kind: "video",
    title: "Living Hope — Because Jesus Lives, We Have Hope",
    description:
      "Because of God’s great mercy, Jesus rose from the dead to give us a new life and a hope that never dies (1 Peter 1:3-4). A powerful Easter resurrection reflection by 4 Kilo Fellowship.",
    durationSeconds: 119,
    thumbnail: {
      id: "thumb-living-hope",
      kind: "image",
      width: 720,
      height: 1280,
      urls: {
        sm: "https://res.cloudinary.com/doi9bg69o/image/upload/v1793867306/my-fellow/video-thumbnails/zskekkbkswokugnfveaf.jpg",
        md: "https://res.cloudinary.com/doi9bg69o/image/upload/v1793867306/my-fellow/video-thumbnails/zskekkbkswokugnfveaf.jpg",
        lg: "https://res.cloudinary.com/doi9bg69o/image/upload/v1793867306/my-fellow/video-thumbnails/zskekkbkswokugnfveaf.jpg",
        original:
          "https://res.cloudinary.com/doi9bg69o/image/upload/v1793867306/my-fellow/video-thumbnails/zskekkbkswokugnfveaf.jpg",
      },
    },
    playbackUrl:
      "https://res.cloudinary.com/doi9bg69o/video/upload/v1793867387/my-fellow/videos/jglnmemtd46ucpurb4qd.mp4",
    videoUrl:
      "https://res.cloudinary.com/doi9bg69o/video/upload/v1793867387/my-fellow/videos/jglnmemtd46ucpurb4qd.mp4",
    speaker: "4 Kilo Fellowship Media & Ministry",
    views: "1.2k views",
    publishedAt: "2026-04-12T00:00:00.000Z",
  },
];

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

    let videos: any[] = [];
    try {
      videos = await prisma.contentItem.findMany({
        where,
        orderBy: [{ publishedAt: "desc" }, { id: "desc" }],
        take: limit + 1,
      });
    } catch {
      videos = [];
    }

    const paginated = buildPaginatedResponse(videos, limit, (item) => ({
      t: item.publishedAt.toISOString(),
      id: item.id,
    }));

    const thumbnailAssetIds = paginated.items
      .map((v) => v.thumbnailAssetId)
      .filter((id): id is string => Boolean(id));
    let assets: any[] = [];
    try {
      if (thumbnailAssetIds.length > 0) {
        assets = await prisma.mediaAsset.findMany({
          where: { id: { in: thumbnailAssetIds } },
        });
      }
    } catch {
      assets = [];
    }
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

    const finalItems =
      items.length === 0
        ? CURATED_DEFAULT_VIDEOS
        : items.some((item) => item.id === "living-hope" || item.title?.toLowerCase().includes("living hope"))
        ? items
        : [CURATED_DEFAULT_VIDEOS[0], ...items];

    return res.json({
      items: finalItems,
      nextCursor: paginated.nextCursor,
      hasMore: paginated.hasMore,
    });
  } catch (err) {
    return res.json({
      items: CURATED_DEFAULT_VIDEOS,
      nextCursor: null,
      hasMore: false,
    });
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
