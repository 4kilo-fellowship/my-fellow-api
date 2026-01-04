import { Request, Response } from "express";
import { AuthService } from "../services/auth.service.js";
import { signUpSchema, signInSchema } from "../validators/auth.validator.js";

export class AuthController {
  static async register(req: Request, res: Response) {
    try {
      const parsed = signUpSchema.parse(req.body);
      const { user, token } = await AuthService.register(parsed);
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
  static async login(req: Request, res: Response) {
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
}
