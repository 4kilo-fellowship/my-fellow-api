import { Router, Response } from "express";
import { z } from "zod";
import { serializeMediaAsset } from "../../platform/serializer.js";
import { buildPaginatedResponse, decodeCursor } from "../../platform/pagination.js";
import { requireAuth, requirePermission, AuthRequest } from "../../middleware/auth.middleware.js";
import { uploadVideoFiles } from "../../middleware/upload.middleware.js";
import {
  getVideoThumbnailUrl,
  uploadFileToCloudinary,
  uploadImageToCloudinary,
} from "../../services/cloudinary.service.js";
import {
  ContentItemModel,
  MediaAssetModel,
} from "../../models/social.models.js";

const router = Router();

const createVideoSchema = z.object({
  title: z.string().trim().min(3).max(120),
  description: z.string().trim().max(1000).optional().default(""),
});

const CURATED_DEFAULT_VIDEOS = [
  {
    id: "living-hope",
    kind: "video",
    title: "Living Hope",
    description:
      "Because of God’s great mercy, Jesus rose from the dead to give us a new life and a hope that never dies (1 Peter 1:3-4). A powerful Easter reflection on the living hope we have through Christ's resurrection.",
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
    publishedAt: "2026-04-12T00:00:00.000Z",
  },
  {
    id: "following-the-king",
    kind: "video",
    title: "ንጉሱን እንዴት እንከተለው",
    description:
      "በብሔራዊ የአመራር ሥልጠና (NLS 2024) ላይ በእዮስያስ ፀጋዬ የተሰጠ ጥልቅ ትምህርት — ንጉሱን ክርስቶስን በሕይወታችንና በዩኒቨርሲቲ ቆይታችን በታማኝነት እንዴት እንደምንከተል።",
    durationSeconds: 2562,
    speaker: "እዮስያስ ፀጋዬ",
    thumbnail: {
      id: "thumb-following-the-king",
      kind: "image",
      width: 1280,
      height: 720,
      urls: {
        sm: "https://res.cloudinary.com/doi9bg69o/image/upload/v1793871738/my-fellow/video-thumbnails/following-the-king-thumb.jpg",
        md: "https://res.cloudinary.com/doi9bg69o/image/upload/v1793871738/my-fellow/video-thumbnails/following-the-king-thumb.jpg",
        lg: "https://res.cloudinary.com/doi9bg69o/image/upload/v1793871738/my-fellow/video-thumbnails/following-the-king-thumb.jpg",
        original:
          "https://res.cloudinary.com/doi9bg69o/image/upload/v1793871738/my-fellow/video-thumbnails/following-the-king-thumb.jpg",
      },
    },
    playbackUrl:
      "https://res.cloudinary.com/doi9bg69o/video/upload/my-fellow/videos/following-the-king-video.mp4",
    videoUrl:
      "https://res.cloudinary.com/doi9bg69o/video/upload/my-fellow/videos/following-the-king-video.mp4",
    publishedAt: "2026-03-20T00:00:00.000Z",
  },
  {
    id: "amelkewalew-worship",
    kind: "video",
    title: "አመልከዋለው | መልሕቅ ኳየር",
    description:
      "የመልሕቅ ኳየር ድንቅ የአምልኮና የምስጋና ዝማሬ — ልብን ወደ እግዚአብሔር ክብርና ጸጋ የሚያቀርብ መንፈሳዊ ህብረት።",
    durationSeconds: 1220,
    speaker: "መልሕቅ ኳየር",
    thumbnail: {
      id: "thumb-amelkewalew",
      kind: "image",
      width: 1280,
      height: 720,
      urls: {
        sm: "https://res.cloudinary.com/doi9bg69o/image/upload/v1793874015/my-fellow/video-thumbnails/amelkewalew-thumb.jpg",
        md: "https://res.cloudinary.com/doi9bg69o/image/upload/v1793874015/my-fellow/video-thumbnails/amelkewalew-thumb.jpg",
        lg: "https://res.cloudinary.com/doi9bg69o/image/upload/v1793874015/my-fellow/video-thumbnails/amelkewalew-thumb.jpg",
        original:
          "https://res.cloudinary.com/doi9bg69o/image/upload/v1793874015/my-fellow/video-thumbnails/amelkewalew-thumb.jpg",
      },
    },
    playbackUrl:
      "https://res.cloudinary.com/doi9bg69o/video/upload/my-fellow/videos/amelkewalew-video.mp4",
    videoUrl:
      "https://res.cloudinary.com/doi9bg69o/video/upload/my-fellow/videos/amelkewalew-video.mp4",
    publishedAt: "2026-02-14T00:00:00.000Z",
  },
];

// GET /api/v1/content/videos
router.get("/content/videos", async (req, res: Response, next) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 20, 50);
    const cursor = decodeCursor(req.query.cursor as string);

    const query: any = {
      kind: "video",
      status: "published",
    };

    if (cursor) {
      query.publishedAt = { $lt: new Date(cursor.t) };
    }

    const items = await ContentItemModel.find(query)
      .sort({ publishedAt: -1 })
      .limit(limit + 1)
      .lean();

    const paginated = buildPaginatedResponse(items, limit, (item: any) => ({
      t: new Date(item.publishedAt).toISOString(),
      id: item._id.toString(),
    }));

    const thumbAssetIds = paginated.items
      .map((i: any) => i.thumbnailAssetId)
      .filter((id): id is string => Boolean(id));

    const thumbAssets = await MediaAssetModel.find({
      $or: [{ _id: { $in: thumbAssetIds } }, { id: { $in: thumbAssetIds } }],
    }).lean();
    const thumbAssetMap = new Map(thumbAssets.map((a: any) => [a._id ? a._id.toString() : a.id, a]));

    const responseItems = paginated.items.map((i: any) => {
      const asset = i.thumbnailAssetId ? thumbAssetMap.get(i.thumbnailAssetId) : null;
      const thumbnail = asset
        ? serializeMediaAsset(asset)
        : i.thumbnailUrl
        ? {
            id: `thumb-${i._id}`,
            kind: "image" as const,
            width: 800,
            height: 450,
            urls: {
              sm: i.thumbnailUrl,
              md: i.thumbnailUrl,
              lg: i.thumbnailUrl,
              original: i.thumbnailUrl,
            },
          }
        : null;

      return {
        id: i._id.toString(),
        kind: i.kind,
        title: i.title,
        description: i.description || "",
        durationSeconds: i.durationSeconds || null,
        thumbnail,
        playbackUrl: i.playbackUrl || null,
        videoUrl: i.playbackUrl || null,
        publishedAt: new Date(i.publishedAt).toISOString(),
      };
    });

    if (responseItems.length === 0) {
      return res.json({
        items: CURATED_DEFAULT_VIDEOS,
        nextCursor: null,
        hasMore: false,
      });
    }

    return res.json({
      items: responseItems,
      nextCursor: paginated.nextCursor,
      hasMore: paginated.hasMore,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/content/videos
router.post(
  "/content/videos",
  requireAuth,
  requirePermission("sermons.media.manage"),
  uploadVideoFiles,
  async (req: AuthRequest, res: Response, next) => {
    try {
      const parsed = createVideoSchema.parse(req.body);
      const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
      const videoFile = files?.video?.[0];
      const thumbFile = files?.thumbnail?.[0];

      if (!videoFile) {
        return res.status(400).json({
          success: false,
          message: "A video file is required (.mp4, .mov, .m4v, .webm)",
        });
      }

      const uploadedVideo = await uploadFileToCloudinary(videoFile.buffer, {
        folder: "my-fellow/videos",
        resource_type: "video",
      });

      let thumbnailUrl = "";
      let thumbnailAssetId: string | null = null;

      if (thumbFile) {
        const uploadedThumb = await uploadImageToCloudinary(thumbFile.buffer, {
          folder: "my-fellow/video-thumbnails",
        });
        thumbnailUrl = uploadedThumb.secure_url;

        const asset = await MediaAssetModel.create({
          ownerId: req.user!.sub,
          purpose: "post",
          status: "ready",
          storageKey: uploadedThumb.secure_url,
          mime: thumbFile.mimetype,
          bytes: uploadedThumb.bytes,
          width: uploadedThumb.width,
          height: uploadedThumb.height,
          variants: {
            sm: uploadedThumb.secure_url,
            md: uploadedThumb.secure_url,
            lg: uploadedThumb.secure_url,
            original: uploadedThumb.secure_url,
          },
        });
        thumbnailAssetId = asset._id.toString();
      } else {
        thumbnailUrl = getVideoThumbnailUrl(uploadedVideo.public_id);
      }

      const durationSeconds = (uploadedVideo as any).duration
        ? Math.round(Number((uploadedVideo as any).duration))
        : null;

      const created = await ContentItemModel.create({
        kind: "video",
        createdBy: req.user!.sub,
        title: parsed.title,
        description: parsed.description || null,
        durationSeconds,
        thumbnailAssetId,
        thumbnailUrl: thumbnailUrl || null,
        playbackUrl: uploadedVideo.secure_url,
        provider: "cloudinary",
        providerRef: uploadedVideo.public_id,
        status: "published",
        publishedAt: new Date(),
      });

      return res.status(201).json({
        success: true,
        video: {
          id: created._id.toString(),
          title: created.title,
          description: created.description,
          durationSeconds: created.durationSeconds,
          thumbnailUrl: created.thumbnailUrl,
          playbackUrl: created.playbackUrl,
          publishedAt: created.publishedAt.toISOString(),
        },
      });
    } catch (err: any) {
      if (err?.name === "ZodError") {
        return res.status(400).json({ success: false, errors: err.errors });
      }
      next(err);
    }
  }
);

// DELETE /api/v1/content/videos/:id
router.delete(
  "/content/videos/:id",
  requireAuth,
  requirePermission("sermons.media.manage"),
  async (req: AuthRequest, res: Response, next) => {
    try {
      const id = String(req.params.id);
      const video = await ContentItemModel.findById(id);

      if (!video) {
        return res.status(404).json({ success: false, message: "Video not found" });
      }

      await ContentItemModel.deleteOne({ _id: id });
      return res.json({ success: true, message: "Video removed successfully" });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
