import { Response, NextFunction } from "express";
import { fromNodeHeaders } from "better-auth/node";
import { auth } from "../auth.js";
import { UserModel } from "../models/user.model.js";
import { verifyJwt } from "../utils/jwt.js";
import { AuthRequest } from "../middleware/auth.middleware.js";

export const optionalAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith("Bearer ")) {
      return next();
    }

    const token = header.split(" ")[1];

    // Attempt Better-Auth session lookup
    try {
      const session = await auth.api.getSession({
        headers: fromNodeHeaders(req.headers),
      });

      if (session && session.user) {
        req.session = session;
        let phoneNumber = (session.user as any).phoneNumber;
        let role = (session.user as any).role;

        if (!phoneNumber || !role) {
          const dbUser = await UserModel.findById(session.user.id).select("phoneNumber role");
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
      // Continue to JWT fallback
    }

    try {
      const payload = verifyJwt(token);
      req.user = payload;
    } catch {
      // Invalid token, ignore for optional auth
    }

    next();
  } catch {
    next();
  }
};
