import { Router } from "express";
import { UploadController } from "../controllers/upload.controller.js";
import { uploadSingle, uploadMultiple } from "../middleware/upload.middleware.js";

const router = Router();

// Upload single image
router.post("/image", uploadSingle, UploadController.uploadImage);

// Upload multiple images
router.post("/images", uploadMultiple, UploadController.uploadImages);

// Delete image
router.delete("/image/:publicId", UploadController.deleteImage);

export default router;
