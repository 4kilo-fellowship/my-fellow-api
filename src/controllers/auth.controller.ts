import { Response } from "express";
import { AuthService } from "../services/auth.service.js";
import { signUpSchema, signInSchema } from "../validators/auth.validator.js";
import { AuthRequest } from "../middleware/auth.middleware.js";

export class AuthController {
  static async register(req: AuthRequest, res: Response) {
    try {
      const body = req.body;
      
      if (typeof body.team === 'string' && (body.team === '' || body.team === 'null')) {
        body.team = null;
      }
      if (typeof body.department === 'string' && (body.department === '' || body.department === 'null')) {
        body.department = null;
      }
      if (typeof body.yearOfStudy === 'string' && (body.yearOfStudy === '' || body.yearOfStudy === 'null')) {
        body.yearOfStudy = null;
      }
      if (typeof body.telegramUserName === 'string' && (body.telegramUserName === '' || body.telegramUserName === 'null')) {
        body.telegramUserName = null;
      }

      const parsed = signUpSchema.parse(body);
      const file = req.file;
      
      const { user, token } = await AuthService.register(parsed, file);
      return res.status(201).json({ success: true, user, token });
    } catch (err: any) {
      if (err?.name === "ZodError") {
        return res.status(400).json({ success: false, errors: err.errors });
      }
      return res.status(400).json({
        success: false,
        message: err.message || "Registration failed",
      });
    }
  }
  static async login(req: AuthRequest, res: Response) {
    try {
      const parsed = signInSchema.parse(req.body);
      const { user, token } = await AuthService.login(parsed);
      return res.status(200).json({ success: true, user, token });
    } catch (err: any) {
      if (err?.name === "ZodError") {
        return res.status(400).json({ success: false, errors: err.errors });
      }
      return res
        .status(401)
        .json({
          success: false,
          message: err.message || "Authentication failed",
        });
    }
  }
  static async getMe(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.sub;
      if (!userId) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
      }
      const user = await AuthService.findById(userId);
      if (!user) {
        return res.status(404).json({ success: false, message: "User not found" });
      }
      const safeUser = {
        id: user._id,
        fullName: user.fullName,
        phoneNumber: user.phoneNumber,
        team: user.team,
        department: user.department,
        yearOfStudy: user.yearOfStudy,
        telegramUserName: user.telegramUserName,
        profileImage: user.profileImage,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      };
      return res.status(200).json({ success: true, user: safeUser });
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        message: err.message || "Failed to fetch user data",
      });
    }
  }
}
