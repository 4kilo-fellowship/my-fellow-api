import { Response } from "express";
import { AuthRequest } from "../middleware/auth.middleware.js";
import { ProductService } from "../services/product.service.js";

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
      const { title, shortDescription, price, imageUrls, stock } = req.body;
      const product = await ProductService.create({
        title,
        shortDescription,
        price,
        imageUrls,
        stock,
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

      const product = await ProductService.update(req.params.id, req.body);
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
