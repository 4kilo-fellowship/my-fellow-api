import { Response } from "express";
import { AuthRequest } from "../middleware/auth.middleware.js";
import WriterRequestService from "../services/writerRequest.service.js";
import { routeParam } from "../utils/routeParam.js";

export class WriterRequestController {
  static async create(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.sub;
      if (!userId) {
        return res
          .status(401)
          .json({ success: false, message: "Unauthorized" });
      }

      const {
        fullName,
        phoneNumber,
        telegramHandle,
        department,
        year,
        sampleTopic,
        message,
      } = req.body;

      if (!fullName || !phoneNumber || !telegramHandle || !sampleTopic) {
        return res.status(400).json({
          success: false,
          message:
            "Full name, phone number, telegram handle, and sample devotion topic are required",
        });
      }

      const request = await WriterRequestService.createRequest({
        userId,
        fullName,
        phoneNumber,
        telegramHandle,
        department,
        year,
        sampleTopic,
        message,
      });

      return res.status(201).json({
        success: true,
        message: "Writer application submitted successfully",
        data: request,
      });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        message: error.message || "Failed to submit writer application",
      });
    }
  }

  static async getMyRequest(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.sub;
      if (!userId) {
        return res
          .status(401)
          .json({ success: false, message: "Unauthorized" });
      }

      const request = await WriterRequestService.getMyRequest(userId);

      return res.status(200).json({
        success: true,
        data: request,
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to fetch writer application",
      });
    }
  }

  static async getAll(req: AuthRequest, res: Response) {
    try {
      const { status, page, limit } = req.query as {
        status?: "pending" | "approved" | "rejected";
        page?: string;
        limit?: string;
      };

      const result = await WriterRequestService.getAllRequests({
        status,
        page: page ? parseInt(page, 10) : 1,
        limit: limit ? parseInt(limit, 10) : 20,
      });

      return res.status(200).json({
        success: true,
        data: result.requests,
        pagination: result.pagination,
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to fetch writer applications",
      });
    }
  }

  static async updateStatus(req: AuthRequest, res: Response) {
    try {
      const requestId = routeParam(req.params.id);
      const { status, adminNotes } = req.body;
      const adminId = req.user?.sub;

      if (!status || !["approved", "rejected"].includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Status must be either 'approved' or 'rejected'",
        });
      }

      const request = await WriterRequestService.updateStatus(
        requestId,
        status,
        adminId,
        adminNotes
      );

      return res.status(200).json({
        success: true,
        message: `Application ${status} successfully`,
        data: request,
      });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        message: error.message || "Failed to update application status",
      });
    }
  }
}

export default WriterRequestController;
