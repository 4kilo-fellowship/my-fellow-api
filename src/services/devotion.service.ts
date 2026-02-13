import DevotionModel, {
  IDevotion,
  DevotionType,
} from "../models/devotion.model.js";
import {
  uploadImageToCloudinary,
  uploadFileToCloudinary,
  deleteImageFromCloudinary,
  extractPublicIdFromUrl,
} from "./cloudinary.service.js";

// ─── Helpers ────────────────────────────────────────────────────────

/**
 * Determine the Cloudinary resource_type for a given devotion type.
 *  - voice  → "video" (Cloudinary treats audio as video resource)
 *  - pdf    → "raw"
 *  - book   → "raw"
 *  - text   → not applicable (no media file)
 */
function getResourceType(type: DevotionType): "image" | "video" | "raw" {
  switch (type) {
    case "voice":
      return "video"; // Cloudinary uses "video" for audio files
    case "pdf":
    case "book":
      return "raw";
    default:
      return "image";
  }
}

// ─── Upload Handlers ────────────────────────────────────────────────

export async function uploadDevotionImage(
  fileBuffer: Buffer,
): Promise<{ secure_url: string; public_id: string }> {
  const result = await uploadImageToCloudinary(fileBuffer, {
    folder: "devotions/images",
  });
  return { secure_url: result.secure_url, public_id: result.public_id };
}

export async function uploadDevotionMedia(
  fileBuffer: Buffer,
  type: DevotionType,
): Promise<{ secure_url: string; public_id: string }> {
  const resourceType = getResourceType(type);
  const folderMap: Record<string, string> = {
    voice: "devotions/audio",
    pdf: "devotions/pdfs",
    book: "devotions/books",
  };
  const folder = folderMap[type] || "devotions/media";

  const result = await uploadFileToCloudinary(fileBuffer, {
    folder,
    resource_type: resourceType,
  });
  return { secure_url: result.secure_url, public_id: result.public_id };
}

// ─── Cleanup Helpers ────────────────────────────────────────────────

export async function deleteDevotionAssets(devotion: IDevotion): Promise<void> {
  const deletions: Promise<void>[] = [];

  if (devotion.imagePublicId) {
    deletions.push(deleteImageFromCloudinary(devotion.imagePublicId, "image"));
  }
  if (devotion.audioPublicId) {
    deletions.push(deleteImageFromCloudinary(devotion.audioPublicId, "video"));
  }
  if (devotion.pdfPublicId) {
    deletions.push(deleteImageFromCloudinary(devotion.pdfPublicId, "raw"));
  }
  if (devotion.bookPublicId) {
    deletions.push(deleteImageFromCloudinary(devotion.bookPublicId, "raw"));
  }

  await Promise.allSettled(deletions); // Don't fail if one cleanup fails
}

// ─── Query Helpers ──────────────────────────────────────────────────

export interface DevotionQueryOptions {
  type?: string;
  featured?: string;
  tags?: string;
  page?: string;
  limit?: string;
  search?: string;
}

export async function queryDevotions(options: DevotionQueryOptions) {
  const filter: any = {};

  if (options.type && options.type !== "all") {
    filter.type = options.type;
  }

  if (options.featured === "true") {
    filter.featured = true;
  }

  if (options.tags) {
    const tagList = options.tags.split(",").map((t) => t.trim());
    filter.tags = { $in: tagList };
  }

  if (options.search) {
    filter.$or = [
      { title: { $regex: options.search, $options: "i" } },
      { author: { $regex: options.search, $options: "i" } },
    ];
  }

  const page = Math.max(1, parseInt(options.page || "1", 10));
  const limit = Math.min(50, Math.max(1, parseInt(options.limit || "20", 10)));
  const skip = (page - 1) * limit;

  const [devotions, total] = await Promise.all([
    DevotionModel.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    DevotionModel.countDocuments(filter),
  ]);

  return {
    devotions,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

// ─── Engagement ─────────────────────────────────────────────────────

export async function incrementViews(id: string) {
  return DevotionModel.findByIdAndUpdate(
    id,
    { $inc: { views: 1 } },
    { new: true },
  ).lean();
}

export async function toggleLike(id: string, increment: boolean) {
  return DevotionModel.findByIdAndUpdate(
    id,
    { $inc: { likes: increment ? 1 : -1 } },
    { new: true },
  ).lean();
}

// ─── Format helpers for frontend ────────────────────────────────────

export function formatCount(num: number): string {
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}k`;
  return num.toString();
}
