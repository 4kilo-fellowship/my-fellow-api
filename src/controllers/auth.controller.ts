import { Response } from "express";
import { AuthRequest } from "../middleware/auth.middleware.js";
import { AuthService } from "../services/auth.service.js";
import { OtpService } from "../services/otp.service.js";
import { OtpPurpose } from "../models/otpVerification.model.js";
import {
  signInSchema,
  signUpSchema,
  updatePhoneSchema,
  updateProfileSchema,
} from "../validators/auth.validator.js";
import { sendOtpSchema, verifyOtpSchema } from "../validators/otp.validator.js";

export class AuthController {
  static async register(req: AuthRequest, res: Response) {
    try {
      const body = req.body;
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

  static async sendOtp(req: AuthRequest, res: Response) {
    try {
      const parsed = sendOtpSchema.parse(req.body);
      const phoneNumber = AuthService.normalizePhone(parsed.phoneNumber);
      await OtpService.send(phoneNumber, parsed.purpose as OtpPurpose);
      return res.status(200).json({
        success: true,
        message: "Verification code sent successfully.",
      });
    } catch (err: any) {
      if (err?.name === "ZodError") {
        return res.status(400).json({ success: false, errors: err.errors });
      }
      return res.status(429).json({
        success: false,
        message: err.message || "Failed to send verification code",
      });
    }
  }

  static async verifyOtp(req: AuthRequest, res: Response) {
    try {
      const parsed = verifyOtpSchema.parse(req.body);
      const phoneNumber = AuthService.normalizePhone(parsed.phoneNumber);
      const otpToken = await OtpService.verify(
        phoneNumber,
        parsed.purpose as OtpPurpose,
        parsed.code,
      );
      return res.status(200).json({ success: true, otpToken });
    } catch (err: any) {
      if (err?.name === "ZodError") {
        return res.status(400).json({ success: false, errors: err.errors });
      }
      return res.status(400).json({
        success: false,
        message: err.message || "Verification failed",
      });
    }
  }

  static async updatePhone(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.sub;
      if (!userId) {
        return res
          .status(401)
          .json({ success: false, message: "Unauthorized" });
      }

      const parsed = updatePhoneSchema.parse(req.body);
      const result = await AuthService.updatePhone(userId, parsed);
      return res.status(200).json({
        success: true,
        message: "Phone number updated successfully",
        user: result.user,
        token: result.token,
      });
    } catch (err: any) {
      if (err?.name === "ZodError") {
        return res.status(400).json({ success: false, errors: err.errors });
      }
      return res.status(400).json({
        success: false,
        message: err.message || "Failed to update phone number",
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
      return res.status(401).json({
        success: false,
        message: err.message || "Authentication failed",
      });
    }
  }

  static async lookupByPhone(req: AuthRequest, res: Response) {
    try {
      const { phoneNumber } = req.body;
      if (!phoneNumber) {
        return res
          .status(400)
          .json({ success: false, message: "Phone number is required" });
      }

      const { user } = await AuthService.lookupByPhoneNumber(phoneNumber);
      return res.status(200).json({ success: true, user });
    } catch (err: any) {
      return res.status(401).json({
        success: false,
        message: err.message || "User not found",
      });
    }
  }
  static async getMe(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.sub;
      if (!userId) {
        return res
          .status(401)
          .json({ success: false, message: "Unauthorized" });
      }
      const user = await AuthService.findById(userId);
      if (!user) {
        return res
          .status(404)
          .json({ success: false, message: "User not found" });
      }
      const safeUser = {
        id: user._id,
        fullName: user.fullName,
        phoneNumber: user.phoneNumber,
        role: user.role,
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

  static async updateProfile(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.sub;
      if (!userId) {
        return res
          .status(401)
          .json({ success: false, message: "Unauthorized" });
      }

      const parsed = updateProfileSchema.parse(req.body);
      const file = req.file;

      const user = await AuthService.updateProfile(userId, parsed, file);
      return res.status(200).json({
        success: true,
        message: "Profile updated successfully",
        user,
      });
    } catch (err: any) {
      if (err?.name === "ZodError") {
        return res.status(400).json({ success: false, errors: err.errors });
      }
      return res.status(400).json({
        success: false,
        message: err.message || "Failed to update profile",
      });
    }
  }
}
