import { Request, Response, NextFunction } from "express";
import { verifyJwt } from "../utils/jwt.js";

export interface AuthRequest extends Request {
  user?: {
    sub: string;
    phoneNumber: string;
    role: "admin" | "user";
  };
}

export const requireAuth = (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith("Bearer ")) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    const token = header.split(" ")[1];
    const payload = verifyJwt(token);
    req.user = payload;
    next();
  } catch  {
    return res
      .status(401)
      .json({ success: false, message: "Invalid or expired token" });
  }
};

export const requireAdmin = (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({
      success: false,
      message: "Forbidden: Only the authorized owner can perform this action",
    });
  }
  next();
};
