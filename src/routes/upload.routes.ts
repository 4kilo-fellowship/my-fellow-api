import { Router } from "express";
import { UploadController } from "../controllers/upload.controller.js";
import {
  uploadSingle,
  uploadMultiple,
} from "../middleware/upload.middleware.js";
import { requireAuth, requireAdmin } from "../middleware/auth.middleware.js";

const router = Router();

// Upload single image
router.post(
  "/image",
  requireAuth,
  requireAdmin,
  uploadSingle,
  UploadController.uploadImage,
);

// Upload multiple images
router.post(
  "/images",
  requireAuth,
  requireAdmin,
  uploadMultiple,
  UploadController.uploadImages,
);

// Delete image
router.delete(
  "/image/:publicId",
  requireAuth,
  requireAdmin,
  UploadController.deleteImage,
);

export default router;
