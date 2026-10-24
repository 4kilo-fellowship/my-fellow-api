import { Request, Response, NextFunction } from "express";
import { fromNodeHeaders } from "better-auth/node";
import { auth } from "../auth.js";
import { UserModel } from "../models/user.model.js";
import { verifyJwt } from "../utils/jwt.js";

export interface AuthRequest extends Request {
  user?: {
    sub: string;
    phoneNumber: string;
    role: "admin" | "user";
  };
  session?: any;
}

export const requireAuth = async (
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

    // 1. First attempt Better-Auth session verification using bearer plugin
    try {
      const session = await auth.api.getSession({
        headers: fromNodeHeaders(req.headers),
      });

      if (session && session.user) {
        req.session = session;
        let phoneNumber = (session.user as any).phoneNumber;
        let role = (session.user as any).role;

        if (!phoneNumber || !role) {
          const dbUser = await UserModel.findById(session.user.id).select(
            "phoneNumber role",
          );
          if (dbUser) {
            phoneNumber = phoneNumber || dbUser.phoneNumber;
            role = role || dbUser.role;
          }
        }

        req.user = {
          sub: String(session.user.id),
          phoneNumber: phoneNumber || "",
          role: (role as "admin" | "user") || "user",
        };
        return next();
      }
    } catch {
      // Better-Auth lookup failed, fallback to JWT check
    }

    // 2. JWT fallback for seamless backwards-compatibility
    const payload = verifyJwt(token);
    req.user = payload;
    next();
  } catch {
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
