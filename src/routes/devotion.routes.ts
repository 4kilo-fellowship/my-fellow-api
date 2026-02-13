import { Router } from "express";
import DevotionController from "../controllers/devotion.controller.js";
import { uploadDevotionFiles } from "../middleware/upload.middleware.js";
import { requireAuth, requireAdmin } from "../middleware/auth.middleware.js";

const router = Router();

// GET /api/devotions?type=voice&featured=true&tags=faith,hope&page=1&limit=10&search=peace
router.get("/", DevotionController.getAllDevotions);

// GET /api/devotions/:id
router.get("/:id", DevotionController.getDevotionById);

// POST /api/devotions/:id/view — record a view (public, no auth)
router.post("/:id/view", DevotionController.recordView);

// POST /api/devotions/:id/like — like/unlike (requires auth)
router.post("/:id/like", requireAuth, DevotionController.likeDevotion);

// POST /api/devotions — create (multipart: image + media fields)
router.post(
  "/",
  requireAuth,
  requireAdmin,
  uploadDevotionFiles,
  DevotionController.createDevotion,
);

// PUT /api/devotions/:id — update (multipart: image + media fields)
router.put(
  "/:id",
  requireAuth,
  requireAdmin,
  uploadDevotionFiles,
  DevotionController.updateDevotion,
);

// DELETE /api/devotions/:id — delete (cleans up Cloudinary assets)
router.delete(
  "/:id",
  requireAuth,
  requireAdmin,
  DevotionController.deleteDevotion,
);

export default router;
