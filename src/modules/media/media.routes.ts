import { Router, Response } from "express";
import { requireAuth, AuthRequest } from "../../middleware/auth.middleware.js";
import { uploadSingle } from "../../middleware/upload.middleware.js";
import { uploadImageToCloudinary } from "../../services/cloudinary.service.js";
import { AppError } from "../../platform/errors.js";
import { serializeMediaAsset } from "../../platform/serializer.js";
import { routeParam } from "../../utils/routeParam.js";
import {
  MediaAssetModel,
  ProfileModel,
} from "../../models/social.models.js";

const router = Router();

// POST /api/v1/media/upload-file (Multipart file upload direct to Cloudinary & MediaAsset)
router.post("/media/upload-file", requireAuth, uploadSingle, async (req: AuthRequest, res: Response, next) => {
  try {
    const ownerId = req.user!.sub;
    if (!req.file) {
      throw AppError.badRequest("No image file provided", "MISSING_FILE");
    }

    const folder = (req.body.folder as string) || "community-posts";
    const fileBuffer = Buffer.from((req.file as Express.Multer.File).buffer);
    const result = await uploadImageToCloudinary(fileBuffer, { folder });

    const asset = await MediaAssetModel.create({
      ownerId,
      purpose: (req.body.purpose as string) || "post",
      status: "ready",
      storageKey: result.secure_url,
      mime: req.file.mimetype || "image/jpeg",
      bytes: result.bytes || null,
      width: result.width || 800,
      height: result.height || 600,
      variants: {
        original: result.secure_url,
        sm: result.secure_url,
        md: result.secure_url,
        lg: result.secure_url,
      },
      readyAt: new Date(),
    });

    return res.status(201).json({
      assetId: asset._id.toString(),
      asset: serializeMediaAsset(asset.toJSON()),
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/media/uploads
router.post("/media/uploads", requireAuth, async (req: AuthRequest, res: Response, next) => {
  try {
    const ownerId = req.user!.sub;
    const { purpose = "post", mime = "image/jpeg", bytes, width, height, storageKey, variants } = req.body;

    if (!storageKey) {
      throw AppError.badRequest("storageKey or media URL is required", "MISSING_STORAGE_KEY");
    }

    const asset = await MediaAssetModel.create({
      ownerId,
      purpose,
      status: "ready",
      storageKey,
      mime,
      bytes: bytes ? Number(bytes) : null,
      width: width ? Number(width) : 800,
      height: height ? Number(height) : 600,
      variants: variants && typeof variants === "object" ? variants : {},
      readyAt: new Date(),
    });

    return res.status(201).json({
      assetId: asset._id.toString(),
      asset: serializeMediaAsset(asset.toJSON()),
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/media/:id
router.get("/media/:id", async (req, res: Response, next) => {
  try {
    const id = routeParam(req.params.id);
    const asset = await MediaAssetModel.findOne({
      $or: [{ _id: id }, { id }],
    }).lean();
    if (!asset) throw AppError.notFound("Media asset not found", "ASSET_NOT_FOUND");

    return res.json({ asset: serializeMediaAsset(asset) });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/me/avatar
router.post("/me/avatar", requireAuth, async (req: AuthRequest, res: Response, next) => {
  try {
    const userId = req.user!.sub;
    const { assetId } = req.body;
    if (!assetId) throw AppError.badRequest("assetId is required", "MISSING_ASSET_ID");

    const asset = await MediaAssetModel.findOne({
      $or: [{ _id: assetId }, { id: assetId }],
    }).lean();
    if (!asset) throw AppError.notFound("Asset not found", "ASSET_NOT_FOUND");

    await ProfileModel.updateOne(
      { userId },
      { $set: { avatarAssetId: assetId } }
    );

    return res.json({ success: true, avatar: serializeMediaAsset(asset) });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/me/cover
router.post("/me/cover", requireAuth, async (req: AuthRequest, res: Response, next) => {
  try {
    const userId = req.user!.sub;
    const { assetId } = req.body;
    if (!assetId) throw AppError.badRequest("assetId is required", "MISSING_ASSET_ID");

    const asset = await MediaAssetModel.findOne({
      $or: [{ _id: assetId }, { id: assetId }],
    }).lean();
    if (!asset) throw AppError.notFound("Asset not found", "ASSET_NOT_FOUND");

    await ProfileModel.updateOne(
      { userId },
      { $set: { coverAssetId: assetId } }
    );

    return res.json({ success: true, cover: serializeMediaAsset(asset) });
  } catch (err) {
    next(err);
  }
});

export default router;
