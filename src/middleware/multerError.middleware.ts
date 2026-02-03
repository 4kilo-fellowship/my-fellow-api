import { Request, Response, NextFunction } from "express";
import { MulterError } from "multer";

export const handleMulterError = (
  err: Error | MulterError,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  if (err instanceof MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        success: false,
        message: "File size too large. Maximum size is 5MB.",
      });
    }
    return res
      .status(400)
      .json({ success: false, message: "Something went wrong" });
  }
  if (err) {
    return res
      .status(400)
      .json({ success: false, message: "File upload error" });
  }
  next();
};
