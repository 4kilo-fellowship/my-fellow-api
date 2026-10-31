import { Router, Response } from "express";
import { requireAuth, AuthRequest } from "../../middleware/auth.middleware.js";
import { prisma } from "../../utils/prisma.js";
import { AppError } from "../../platform/errors.js";
import { serializeMediaAsset } from "../../platform/serializer.js";
import { routeParam } from "../../utils/routeParam.js";

const router = Router();

// POST /api/v1/media/uploads
router.post("/media/uploads", requireAuth, async (req: AuthRequest, res: Response, next) => {
  try {
    const ownerId = req.user!.sub;
    const { purpose = "post", mime = "image/jpeg", bytes, width, height, storageKey, variants } = req.body;

    if (!storageKey) {
      throw AppError.badRequest("storageKey or media URL is required", "MISSING_STORAGE_KEY");
    }

    const asset = await prisma.mediaAsset.create({
      data: {
        ownerId,
        purpose,
        status: "ready",
        storageKey,
        mime,
        bytes: bytes ? BigInt(bytes) : null,
        width: width ? Number(width) : 800,
        height: height ? Number(height) : 600,
        variants: variants && typeof variants === "object" ? variants : {},
        readyAt: new Date(),
      },
    });

    return res.status(201).json({
      assetId: asset.id,
      asset: serializeMediaAsset(asset),
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/media/:id
router.get("/media/:id", async (req, res: Response, next) => {
  try {
    const id = routeParam(req.params.id);
    const asset = await prisma.mediaAsset.findUnique({ where: { id } });
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

    const asset = await prisma.mediaAsset.findUnique({ where: { id: assetId } });
    if (!asset) throw AppError.notFound("Asset not found", "ASSET_NOT_FOUND");

    await prisma.profile.update({
      where: { userId },
      data: { avatarAssetId: assetId },
    });

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

    const asset = await prisma.mediaAsset.findUnique({ where: { id: assetId } });
    if (!asset) throw AppError.notFound("Asset not found", "ASSET_NOT_FOUND");

    await prisma.profile.update({
      where: { userId },
      data: { coverAssetId: assetId },
    });

    return res.json({ success: true, cover: serializeMediaAsset(asset) });
  } catch (err) {
    next(err);
  }
});

export default router;
