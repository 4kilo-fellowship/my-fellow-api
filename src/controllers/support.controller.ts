import { Response } from "express";
import { AuthRequest } from "../middleware/auth.middleware.js";
import { SupportService } from "../services/support.service.js";
import { supportTicketSchema } from "../validators/support.validator.js";

export class SupportController {
  static async createTicket(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res
          .status(401)
          .json({ success: false, message: "Unauthorized" });
      }

      const validatedData = supportTicketSchema.parse(req.body);

      const ticket = await SupportService.createTicket(
        req.user.sub,
        validatedData.message,
        req.file as Express.Multer.File,
      );

      res.status(201).json({
        success: true,
        message: "Support enquiry sent successfully",
        data: ticket,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || "Failed to send support enquiry",
      });
    }
  }
}
