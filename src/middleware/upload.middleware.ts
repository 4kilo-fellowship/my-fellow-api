import multer from "multer";
import { Request } from "express";

// Configure multer to use memory storage (buffer)
const storage = multer.memoryStorage();

// File filter to only allow images
const fileFilter = (
  req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  // Accept images only
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("Only image files are allowed"));
  }
};

// Configure multer
export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});

// Middleware for single file upload
export const uploadSingle = upload.single("image");

// Middleware for multiple file uploads
export const uploadMultiple = upload.array("images", 10);
