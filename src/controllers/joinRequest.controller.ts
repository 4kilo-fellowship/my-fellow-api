import { Response } from "express";
import { AuthRequest } from "../middleware/auth.middleware.js";
import { JoinRequestService } from "../services/joinRequest.service.js";

export class JoinRequestController {
  static async create(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.sub;
      if (!userId) {
        return res
          .status(401)
          .json({ success: false, message: "Unauthorized" });
      }

      const {
        teamId,
        fullName,
        phoneNumber,
        profileImage,
        department,
        year,
        telegramHandle,
        message,
      } = req.body;

      const request = await JoinRequestService.createRequest({
        userId,
        teamId,
        fullName,
        phoneNumber,
        profileImage,
        department,
        year,
        telegramHandle,
        message,
      });

      return res.status(201).json({
        success: true,
        message: "Join request submitted successfully",
        data: request,
      });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        message: error.message || "Failed to create join request",
      });
    }
  }

  static async updateStatus(req: AuthRequest, res: Response) {
    try {
      const { requestId } = req.params;
      const { status } = req.body;

      const request = await JoinRequestService.updateStatus(requestId, status);

      return res.status(200).json({
        success: true,
        message: `Join request ${status}`,
        data: request,
      });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        message: error.message || "Failed to update join request status",
      });
    }
  }

  static async getAll(req: AuthRequest, res: Response) {
    try {
      const requests = await JoinRequestService.getRequests();
      return res.status(200).json({
        success: true,
        data: requests,
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to fetch join requests",
      });
    }
  }

  static async getMyRequests(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.sub;
      if (!userId) {
        return res
          .status(401)
          .json({ success: false, message: "Unauthorized" });
      }

      const requests = await JoinRequestService.getUserRequests(userId);
      return res.status(200).json({
        success: true,
        data: requests,
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to fetch your join requests",
      });
    }
  }
}
