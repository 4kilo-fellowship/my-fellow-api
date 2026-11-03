import { Router } from "express";
import DevotionController from "../controllers/devotion.controller.js";
import WriterRequestController from "../controllers/writerRequest.controller.js";
import { uploadDevotionFiles } from "../middleware/upload.middleware.js";
import { requireAuth, requireAdmin } from "../middleware/auth.middleware.js";

const router = Router();

// ─── WRITER APPLICATION REQUESTS ──────────────────────────────────────
// POST /api/devotions/writer-requests — submit a writer application
router.post(
  "/writer-requests",
  requireAuth,
  WriterRequestController.create
);

// GET /api/devotions/writer-requests/me — fetch logged-in user's application
router.get(
  "/writer-requests/me",
  requireAuth,
  WriterRequestController.getMyRequest
);

// GET /api/devotions/writer-requests — list applications (admin)
router.get(
  "/writer-requests",
  requireAuth,
  requireAdmin,
  WriterRequestController.getAll
);

// PATCH /api/devotions/writer-requests/:id/status — update status (admin)
router.patch(
  "/writer-requests/:id/status",
  requireAuth,
  requireAdmin,
  WriterRequestController.updateStatus
);

// ─── DEVOTIONS ────────────────────────────────────────────────────────
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
