import multer, { FileFilterCallback } from "multer";
import { Request } from "express";

const storage = multer.memoryStorage();

// ─── Image-only filter (existing behavior) ──────────────────────────
const imageFilter = (
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

// ─── Devotion media filter (images + audio + PDF + documents) ───────
const devotionMediaFilter = (
  req: Request,
  file: Express.Multer.File,
  cb: FileFilterCallback,
) => {
  const allowedMimeTypes = [
    // Images
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
    // Audio (voice devotions)
    "audio/mpeg",
    "audio/mp3",
    "audio/wav",
    "audio/ogg",
    "audio/aac",
    "audio/m4a",
    "audio/x-m4a",
    // PDF
    "application/pdf",
    // eBooks / Documents
    "application/epub+zip",
    "application/x-mobipocket-ebook",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
    "application/msword", // .doc
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        `File type "${file.mimetype}" is not allowed. Accepted: images, audio (mp3/wav/ogg/aac/m4a), PDF, EPUB, MOBI, DOC/DOCX`,
      ),
    );
  }
};

// ─── Standard image upload (existing) ───────────────────────────────
export const upload = multer({
  storage,
  fileFilter: imageFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});

export const uploadSingle = upload.single("image");
export const uploadMultiple = upload.array("images", 10);

// ─── Devotion upload (supports multiple file fields) ────────────────
export const devotionUpload = multer({
  storage,
  fileFilter: devotionMediaFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit (audio/books can be large)
  },
});

/**
 * Accepts up to 3 file fields for a devotion:
 *  - "image"    → cover/thumbnail image
 *  - "media"    → the main media file (audio for voice, PDF for pdf, epub/mobi for book)
 */
export const uploadDevotionFiles = devotionUpload.fields([
  { name: "image", maxCount: 1 },
  { name: "media", maxCount: 1 },
]);
