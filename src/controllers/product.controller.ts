import { Response } from "express";
import { AuthRequest } from "../middleware/auth.middleware.js";
import { ProductService } from "../services/product.service.js";
import { uploadImageToCloudinary } from "../services/cloudinary.service.js";

export class ProductController {
  static async getAll(req: AuthRequest, res: Response) {
    try {
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(
        100,
        Math.max(1, parseInt(req.query.limit as string) || 20),
      );

      const result = await ProductService.getAll(page, limit);
      return res.status(200).json({ success: true, data: result });
    } catch (error: any) {
      return res
        .status(500)
        .json({ success: false, message: error.message || "Server error" });
    }
  }

  static async getById(req: AuthRequest, res: Response) {
    try {
      const product = await ProductService.getById(req.params.id);
      if (!product) {
        return res
          .status(404)
          .json({ success: false, message: "Product not found" });
      }
      return res.status(200).json({ success: true, data: product });
    } catch (error: any) {
      return res
        .status(500)
        .json({ success: false, message: error.message || "Server error" });
    }
  }

  static async create(req: AuthRequest, res: Response) {
    try {
      const { title, shortDescription, price, imageUrls, stock, category } =
        req.body;

      let finalImageUrls: string[] = Array.isArray(imageUrls)
        ? imageUrls
        : imageUrls
          ? [imageUrls]
          : [];

      // Handle file uploads
      if (req.files && Array.isArray(req.files) && req.files.length > 0) {
        try {
          const folder = category
            ? `marketplace/${category.toLowerCase().replace(/\s+/g, "-")}`
            : "marketplace/others";

          const uploadPromises = (req.files as Express.Multer.File[]).map(
            (file) => uploadImageToCloudinary(file.buffer, { folder }),
          );

          const uploadResults = await Promise.all(uploadPromises);
          const uploadedUrls = uploadResults.map((result) => result.secure_url);
          finalImageUrls = [...finalImageUrls, ...uploadedUrls];
        } catch (uploadError: any) {
          console.error("Cloudinary Upload Failed:", uploadError);
          return res.status(503).json({
            success: false,
            message:
              "Image upload service (Cloudinary) is temporarily unavailable. Please check your internet connection.",
            error: uploadError.message,
          });
        }
      }

      if (finalImageUrls.length === 0) {
        return res
          .status(400)
          .json({ success: false, message: "At least one image is required" });
      }

      const product = await ProductService.create({
        title,
        shortDescription,
        price,
        imageUrls: finalImageUrls,
        stock: parseInt(stock as string) || 0,
        category: category || "other",
      });
      return res.status(201).json({ success: true, data: product });
    } catch (error: any) {
      return res
        .status(500)
        .json({ success: false, message: error.message || "Server error" });
    }
  }

  static async update(req: AuthRequest, res: Response) {
    try {
      const existing = await ProductService.getById(req.params.id);
      if (!existing) {
        return res
          .status(404)
          .json({ success: false, message: "Product not found" });
      }

      const { title, shortDescription, price, imageUrls, stock, category } =
        req.body;
      let finalImageUrls = imageUrls;

      // Handle file uploads if any
      if (req.files && Array.isArray(req.files) && req.files.length > 0) {
        const cat = category || existing.category || "other";
        const folder = `marketplace/${cat.toLowerCase().replace(/\s+/g, "-")}`;

        const uploadPromises = (req.files as Express.Multer.File[]).map(
          (file) => uploadImageToCloudinary(file.buffer, { folder }),
        );

        const uploadResults = await Promise.all(uploadPromises);
        const uploadedUrls = uploadResults.map((result) => result.secure_url);

        // If body has images, we append. If not, we might want to keep existing or replace.
        // For simplicity, we'll append to existing if imageUrls is not provided in body,
        // or append to body imageUrls if provided.
        const baseImages = Array.isArray(imageUrls)
          ? imageUrls
          : imageUrls
            ? [imageUrls]
            : existing.imageUrls;

        finalImageUrls = [...baseImages, ...uploadedUrls];
      }

      const product = await ProductService.update(req.params.id, {
        title,
        shortDescription,
        price: price ? parseFloat(price as string) : undefined,
        imageUrls: finalImageUrls,
        stock: stock ? parseInt(stock as string) : undefined,
        category,
      });
      return res.status(200).json({ success: true, data: product });
    } catch (error: any) {
      return res
        .status(500)
        .json({ success: false, message: error.message || "Server error" });
    }
  }

  static async remove(req: AuthRequest, res: Response) {
    try {
      const existing = await ProductService.getById(req.params.id);
      if (!existing) {
        return res
          .status(404)
          .json({ success: false, message: "Product not found" });
      }

      await ProductService.remove(req.params.id);
      return res
        .status(200)
        .json({ success: true, message: "Product deleted" });
    } catch (error: any) {
      return res
        .status(500)
        .json({ success: false, message: error.message || "Server error" });
    }
  }
}

export default ProductController;
