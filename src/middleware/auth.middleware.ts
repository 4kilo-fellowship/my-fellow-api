import { Request, Response, NextFunction } from "express";
import { fromNodeHeaders } from "better-auth/node";
import { auth } from "../auth.js";
import { UserModel } from "../models/user.model.js";
import { verifyJwt } from "../utils/jwt.js";
import {
  Permission,
  roleHasPermission,
} from "../rbac/permissions.js";
import { RoleGrantModel } from "../models/rbac.model.js";
import { TeamMembershipModel } from "../models/rbac.model.js";
import { normalizeRole, Role } from "../rbac/permissions.js";
import { writeAuditLog } from "../rbac/audit.js";

export interface AuthRequest extends Request {
  user?: {
    sub: string;
    phoneNumber: string;
    role: string;
    permissions?: string[];
    authVersion?: number;
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

        const dbUser = await UserModel.findById(session.user.id).select(
          "phoneNumber role authVersion",
        );
        if (!dbUser) {
          return res.status(401).json({ success: false, message: "Unauthorized" });
        }
        const grants = await RoleGrantModel.find({
          userId: dbUser._id,
          $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }],
        }).select("permission");
        req.user = {
          sub: String(session.user.id),
          phoneNumber: phoneNumber || dbUser.phoneNumber,
          role: dbUser.role || role || "member",
          permissions: grants.map((grant) => grant.permission),
          authVersion: dbUser.authVersion,
        };
        return next();
      }
    } catch {
      // Better-Auth lookup failed, fallback to JWT check
    }

    // 2. JWT fallback for seamless backwards-compatibility
    const payload = verifyJwt<{ sub?: string; phoneNumber?: string; role?: string; authVersion?: number }>(token);
    if (!payload.sub) {
      return res.status(401).json({ success: false, message: "Invalid or expired token" });
    }
    const dbUser = await UserModel.findById(payload.sub).select(
      "phoneNumber role authVersion",
    );
    if (!dbUser || (payload.authVersion !== undefined && payload.authVersion !== dbUser.authVersion)) {
      return res.status(401).json({ success: false, message: "Session expired" });
    }
    const grants = await RoleGrantModel.find({
      userId: dbUser._id,
      $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }],
    }).select("permission");
    req.user = {
      sub: String(dbUser._id),
      phoneNumber: dbUser.phoneNumber,
      role: dbUser.role,
      permissions: grants.map((grant) => grant.permission),
      authVersion: dbUser.authVersion,
    };
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
  if (!req.user || !roleHasPermission(req.user.role, "settings.manage", req.user.permissions)) {
    return res.status(403).json({
      success: false,
      message: "Forbidden: Only the authorized owner can perform this action",
    });
  }
  next();
};

export function requirePermission(permission: Permission) {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    if (
      !req.user ||
      !roleHasPermission(req.user.role, permission, req.user.permissions)
    ) {
      await writeAuditLog({
        req,
        actorId: req.user?.sub,
        action: "authorization.denied",
        resource: req.baseUrl || req.path,
        permission,
        outcome: "denied",
      }).catch(() => undefined);
      return res.status(403).json({
        success: false,
        message: "Forbidden",
      });
    }
    await writeAuditLog({
      req,
      actorId: req.user?.sub,
      action:
        req.method === "DELETE"
          ? "deletion.allowed"
          : permission === "finance.view"
            ? "finance.accessed"
            : permission === "reports.export"
              ? "export.accessed"
              : "authorization.allowed",
      resource: req.baseUrl || req.path,
      permission,
      outcome: "allowed",
    });
    return next();
  };
}

const ROLE_RANK: Record<Role, number> = {
  member: 1,
  coordinator: 2,
  team_leader: 3,
  leader: 4,
  super_admin: 5,
};

export function requireMinimumRole(role: Role) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || ROLE_RANK[normalizeRole(req.user.role)] < ROLE_RANK[role]) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }
    return next();
  };
}

export function requireTeamScope(paramName = "teamId") {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ success: false, message: "Unauthorized" });
    const role = normalizeRole(req.user.role);
    if (role === "super_admin" || role === "leader") return next();
    const teamId = String(req.params[paramName] || req.params.id || "");
    const membership = await TeamMembershipModel.exists({
      userId: req.user.sub,
      teamId,
    });
    if (!membership) {
      return res.status(403).json({ success: false, message: "Outside your team scope" });
    }
    return next();
  };
}
