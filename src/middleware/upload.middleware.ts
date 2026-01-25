import multer, { FileFilterCallback } from "multer";
import { Request } from "express";

// configure multer to use memory storage or buffer
const storage = multer.memoryStorage();

// file filter to only allow images
const fileFilter = (
  req: Request,
  file: Express.Multer.File,
  cb: FileFilterCallback,
) => {
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("Only image files are allowed"));
  }
};

// multer setup
export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});

export const uploadSingle = upload.single("image");

export const uploadMultiple = upload.array("images", 10);
