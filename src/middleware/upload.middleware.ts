import multer, { FileFilterCallback } from "multer";
import { Request } from "express";

const storage = multer.memoryStorage();

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

const devotionMediaFilter = (
  req: Request,
  file: Express.Multer.File,
  cb: FileFilterCallback,
) => {
  const allowedMimeTypes = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
    "audio/mpeg",
    "audio/mp3",
    "audio/wav",
    "audio/ogg",
    "audio/aac",
    "audio/m4a",
    "audio/x-m4a",
    "application/pdf",
    "application/epub+zip",
    "application/x-mobipocket-ebook",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/msword",
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

export const upload = multer({
  storage,
  fileFilter: imageFilter,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});

export const uploadSingle = upload.single("image");
export const uploadMultiple = upload.array("images", 10);

export const uploadPosterImages = upload.any();

export const devotionUpload = multer({
  storage,
  fileFilter: devotionMediaFilter,
  limits: {
    fileSize: 50 * 1024 * 1024,
  },
});

export const uploadDevotionFiles = devotionUpload.fields([
  { name: "image", maxCount: 1 },
  { name: "media", maxCount: 1 },
]);
