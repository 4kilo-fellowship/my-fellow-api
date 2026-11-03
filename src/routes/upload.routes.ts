import { Router } from "express";
import { UploadController } from "../controllers/upload.controller.js";
import {
  uploadSingle,
  uploadMultiple,
} from "../middleware/upload.middleware.js";
import { requireAuth, requirePermission } from "../middleware/auth.middleware.js";

const router = Router();

// Upload single image
router.post(
  "/image",
  requireAuth,
  requirePermission("sermons.media.manage"),
  uploadSingle,
  UploadController.uploadImage,
);

// Upload multiple images
router.post(
  "/images",
  requireAuth,
  requirePermission("sermons.media.manage"),
  uploadMultiple,
  UploadController.uploadImages,
);

// Delete image
router.delete(
  "/image/:publicId",
  requireAuth,
  requirePermission("sermons.media.manage"),
  UploadController.deleteImage,
);

export default router;
