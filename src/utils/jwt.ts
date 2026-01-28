import { Request, Response } from "express";
import {
  uploadImageToCloudinary,
  deleteImageFromCloudinary,
} from "../services/cloudinary.service.js";

export class UploadController {
  /**
   * Upload a single image
   * POST /api/upload/image
   */
  static async uploadImage(req: Request, res: Response) {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "No image file provided",
        });
      }

      const folder = (req.body.folder as string) || "profile-images";

      // Type-safe: cast req.file to Express.Multer.File
      const fileBuffer = Buffer.from((req.file as Express.Multer.File).buffer);

      const result = await uploadImageToCloudinary(fileBuffer, { folder });

      res.status(200).json({
        success: true,
        data: {
          url: result.secure_url,
          publicId: result.public_id,
          format: result.format,
          width: result.width,
          height: result.height,
          bytes: result.bytes,
        },
      });
    } catch (error: any) {
      console.error("Upload error:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to upload image",
      });
    }
  }

  /**
   * Upload multiple images
   * POST /api/upload/images
   */
  static async uploadImages(req: Request, res: Response) {
    try {
      if (!req.files || (Array.isArray(req.files) && req.files.length === 0)) {
        return res.status(400).json({
          success: false,
          message: "No image files provided",
        });
      }

      // Ensure files is an array of Multer files
      const files = Array.isArray(req.files)
        ? (req.files as Express.Multer.File[])
        : [req.files as Express.Multer.File[]];

      const folder = (req.body.folder as string) || "profile-images";

      const uploadPromises = files.map((file) =>
        uploadImageToCloudinary(Buffer.from(file.buffer), { folder }),
      );

      const results = await Promise.all(uploadPromises);

      res.status(200).json({
        success: true,
        data: results.map((result) => ({
          url: result.secure_url,
          publicId: result.public_id,
          format: result.format,
          width: result.width,
          height: result.height,
          bytes: result.bytes,
        })),
      });
    } catch (error: any) {
      console.error("Upload error:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to upload images",
      });
    }
  }

  /**
   * Delete an image from Cloudinary
   * DELETE /api/upload/image/:publicId
   */
  static async deleteImage(req: Request, res: Response) {
    try {
      const { publicId } = req.params;

      if (!publicId) {
        return res.status(400).json({
          success: false,
          message: "Public ID is required",
        });
      }

      await deleteImageFromCloudinary(publicId);

      res.status(200).json({
        success: true,
        message: "Image deleted successfully",
      });
    } catch (error: any) {
      console.error("Delete error:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to delete image",
      });
    }
  }
}
