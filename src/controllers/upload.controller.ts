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

      const result = await uploadImageToCloudinary(req.file.buffer, {
        folder,
      });

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

      const files = Array.isArray(req.files) ? req.files : [req.files];
      const folder = (req.body.folder as string) || "profile-images";

      const uploadPromises = files.map((file) =>
        uploadImageToCloudinary(file.buffer, { folder })
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
