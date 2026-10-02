import { Request, Response, NextFunction } from "express";
import { auth } from "../auth.js";
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
        headers: req.headers as any,
      });

      if (session && session.user) {
        req.session = session;
        req.user = {
          sub: session.user.id,
          phoneNumber: (session.user as any).phoneNumber || "",
          role: ((session.user as any).role as "admin" | "user") || "user",
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
