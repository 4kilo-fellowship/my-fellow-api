import { Router, Response } from "express";
import { requireAuth, AuthRequest } from "../../middleware/auth.middleware.js";
import { AppError } from "../../platform/errors.js";
import { serializeMediaAsset } from "../../platform/serializer.js";
import { routeParam } from "../../utils/routeParam.js";
import {
  HighlightModel,
  MediaAssetModel,
} from "../../models/social.models.js";

const router = Router();

// POST /api/v1/me/highlights
router.post("/me/highlights", requireAuth, async (req: AuthRequest, res: Response, next) => {
  try {
    const ownerId = req.user!.sub;
    const { title, emoji, coverAssetId, items } = req.body;

    if (!title || typeof title !== "string") {
      throw AppError.badRequest("Title is required", "MISSING_TITLE");
    }

    const count = await HighlightModel.countDocuments({ ownerId });
    if (count >= 10) {
      throw AppError.badRequest("Maximum of 10 story highlights reached", "MAX_HIGHLIGHTS_REACHED");
    }

    const highlightDoc = await HighlightModel.create({
      ownerId,
      title: title.slice(0, 20),
      emoji: emoji || null,
      coverAssetId: coverAssetId || null,
      position: count,
      items: Array.isArray(items)
        ? items.slice(0, 15).map((it: any, index: number) => ({
            position: index,
            postId: it.postId || null,
            assetId: it.assetId || null,
          }))
        : [],
    });

    return res.status(201).json({
      id: highlightDoc._id.toString(),
      title: highlightDoc.title,
      emoji: highlightDoc.emoji,
      cover: null,
      itemsCount: highlightDoc.items.length,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/highlights/:id
router.get("/highlights/:id", async (req, res: Response, next) => {
  try {
    const id = routeParam(req.params.id);
    const highlight = await HighlightModel.findById(id).lean();

    if (!highlight) throw AppError.notFound("Highlight not found", "HIGHLIGHT_NOT_FOUND");

    let cover = null;
    if ((highlight as any).coverAssetId) {
      const coverAsset = await MediaAssetModel.findOne({
        $or: [{ _id: (highlight as any).coverAssetId }, { id: (highlight as any).coverAssetId }],
      }).lean();
      cover = serializeMediaAsset(coverAsset);
    }

    const items = (highlight as any).items || [];
    const assetIds = items.map((i: any) => i.assetId).filter(Boolean);
    const assets = await MediaAssetModel.find({
      $or: [{ _id: { $in: assetIds } }, { id: { $in: assetIds } }],
    }).lean();
    const assetMap = new Map(assets.map((a: any) => [a._id ? a._id.toString() : a.id, a]));

    return res.json({
      id: (highlight as any)._id.toString(),
      title: (highlight as any).title,
      emoji: (highlight as any).emoji,
      cover,
      items: items.map((i: any) => ({
        position: i.position,
        postId: i.postId,
        media: serializeMediaAsset(assetMap.get(i.assetId)),
      })),
    });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/v1/highlights/:id
router.delete("/highlights/:id", requireAuth, async (req: AuthRequest, res: Response, next) => {
  try {
    const id = routeParam(req.params.id);
    const userId = req.user!.sub;

    const highlight = await HighlightModel.findById(id);
    if (!highlight) throw AppError.notFound("Highlight not found", "HIGHLIGHT_NOT_FOUND");

    if (highlight.ownerId !== userId) {
      throw AppError.forbidden("Cannot delete another member's highlight", "FORBIDDEN");
    }

    await HighlightModel.deleteOne({ _id: id });
    return res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

export default router;
