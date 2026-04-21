import { Response } from "express";
import { AuthRequest } from "../middleware/auth.middleware.js";
import { OrderService } from "../services/order.service.js";
import type { OrderStatus } from "@prisma/client";

export class OrderController {
  static async create(req: AuthRequest, res: Response) {
    try {
      const userId = req.user!.sub;
      const { items } = req.body;

      const order = await OrderService.create(userId, items);
      return res.status(201).json({ success: true, data: order });
    } catch (error: any) {
      if (
        error.message?.includes("Insufficient stock") ||
        error.message?.includes("Product not found")
      ) {
        return res.status(400).json({ success: false, message: error.message });
      }
      return res
        .status(500)
        .json({ success: false, message: error.message || "Server error" });
    }
  }

  static async getMyOrders(req: AuthRequest, res: Response) {
    try {
      const userId = req.user!.sub;
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(
        100,
        Math.max(1, parseInt(req.query.limit as string) || 20),
      );

      const result = await OrderService.getByUser(userId, page, limit);
      return res.status(200).json({ success: true, data: result });
    } catch (error: any) {
      return res
        .status(500)
        .json({ success: false, message: error.message || "Server error" });
    }
  }

  static async getAll(req: AuthRequest, res: Response) {
    try {
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(
        100,
        Math.max(1, parseInt(req.query.limit as string) || 20),
      );

      const result = await OrderService.getAll(page, limit);
      return res.status(200).json({ success: true, data: result });
    } catch (error: any) {
      return res
        .status(500)
        .json({ success: false, message: error.message || "Server error" });
    }
  }

  static async getById(req: AuthRequest, res: Response) {
    try {
      const order = await OrderService.getById(req.params.id);
      if (!order) {
        return res
          .status(404)
          .json({ success: false, message: "Order not found" });
      }

      if (req.user!.role !== "admin" && order.userId !== req.user!.sub) {
        return res.status(403).json({ success: false, message: "Forbidden" });
      }

      return res.status(200).json({ success: true, data: order });
    } catch (error: any) {
      return res
        .status(500)
        .json({ success: false, message: error.message || "Server error" });
    }
  }

  static async updateStatus(req: AuthRequest, res: Response) {
    try {
      const existing = await OrderService.getById(req.params.id);
      if (!existing) {
        return res
          .status(404)
          .json({ success: false, message: "Order not found" });
      }

      const { status } = req.body as { status: OrderStatus };
      const order = await OrderService.updateStatus(req.params.id, status);
      return res.status(200).json({ success: true, data: order });
    } catch (error: any) {
      return res
        .status(500)
        .json({ success: false, message: error.message || "Server error" });
    }
  }
}

export default OrderController;
