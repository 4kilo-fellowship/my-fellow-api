import { Response } from "express";
import mongoose from "mongoose";
import { AuthRequest } from "../middleware/auth.middleware.js";
import { RoleGrantModel, TeamMembershipModel } from "../models/rbac.model.js";
import { UserModel } from "../models/user.model.js";
import {
  normalizeRole,
  Permission,
  PERMISSIONS,
  ROLES,
  Role,
} from "../rbac/permissions.js";
import { writeAuditLog } from "../rbac/audit.js";

const rank: Record<Role, number> = {
  super_admin: 5,
  leader: 4,
  team_leader: 3,
  coordinator: 2,
  member: 1,
};

function validRole(value: unknown): value is Role {
  return typeof value === "string" && (ROLES as readonly string[]).includes(value);
}

export class RbacController {
  static async assignRole(req: AuthRequest, res: Response) {
    const targetId = String(req.params.userId);
    const requestedRole = req.body?.role;
    if (!mongoose.isValidObjectId(targetId) || !validRole(requestedRole)) {
      return res.status(400).json({ success: false, message: "Valid userId and role are required" });
    }

    const actorRole = normalizeRole(req.user?.role);
    const target = await UserModel.findById(targetId).select("_id role authVersion");
    if (!target || !req.user) return res.status(404).json({ success: false, message: "User not found" });
    if (targetId === req.user.sub) {
      return res.status(403).json({ success: false, message: "Self-promotion is not allowed" });
    }
    if (
      actorRole !== "super_admin" &&
      (rank[requestedRole] >= rank[actorRole] || requestedRole === "super_admin")
    ) {
      return res.status(403).json({ success: false, message: "Cannot assign an equal or higher role" });
    }
    if (normalizeRole(target.role) === "super_admin" && requestedRole !== "super_admin") {
      const count = await UserModel.countDocuments({ role: { $in: ["super_admin", "admin"] } });
      if (count <= 1) return res.status(409).json({ success: false, message: "Cannot remove the last Super Admin" });
    }

    const updated = await UserModel.findByIdAndUpdate(
      targetId,
      { $set: { role: requestedRole }, $inc: { authVersion: 1 } },
      { new: true, select: "_id role authVersion" },
    );
    await writeAuditLog({
      req,
      actorId: req.user.sub,
      action: "role.assigned",
      resource: "user",
      resourceId: targetId,
      outcome: "allowed",
      metadata: { from: target.role, to: requestedRole },
    });
    return res.json({ success: true, data: updated });
  }

  static async grantPermission(req: AuthRequest, res: Response) {
    const targetId = String(req.params.userId);
    const permission = req.body?.permission as Permission;
    if (
      !mongoose.isValidObjectId(targetId) ||
      !PERMISSIONS.includes(permission)
    ) {
      return res.status(400).json({ success: false, message: "Valid userId and permission are required" });
    }
    const target = await UserModel.findById(targetId).select("_id");
    if (!target || !req.user) return res.status(404).json({ success: false, message: "User not found" });
    const grant = await RoleGrantModel.findOneAndUpdate(
      { userId: target._id, permission },
      { $set: { grantedBy: req.user.sub, expiresAt: req.body?.expiresAt ?? null } },
      { upsert: true, new: true, runValidators: true },
    );
    await UserModel.updateOne({ _id: target._id }, { $inc: { authVersion: 1 } });
    await writeAuditLog({
      req,
      actorId: req.user.sub,
      action: "permission.granted",
      resource: "user",
      resourceId: targetId,
      permission,
      outcome: "allowed",
    });
    return res.status(201).json({ success: true, data: grant });
  }

  static async revokePermission(req: AuthRequest, res: Response) {
    const targetId = String(req.params.userId);
    const permission = String(req.params.permission) as Permission;
    if (!mongoose.isValidObjectId(targetId) || !req.user) {
      return res.status(400).json({ success: false, message: "Valid userId is required" });
    }
    await RoleGrantModel.deleteOne({ userId: targetId, permission });
    await UserModel.updateOne({ _id: targetId }, { $inc: { authVersion: 1 } });
    await writeAuditLog({
      req,
      actorId: req.user.sub,
      action: "permission.revoked",
      resource: "user",
      resourceId: targetId,
      permission,
      outcome: "allowed",
    });
    return res.json({ success: true });
  }

  static async assignTeamRole(req: AuthRequest, res: Response) {
    const { userId, teamId } = req.params;
    const role = req.body?.role;
    if (!req.user || !mongoose.isValidObjectId(userId) || !mongoose.isValidObjectId(teamId) ||
      !["team_leader", "coordinator"].includes(role)) {
      return res.status(400).json({ success: false, message: "Valid userId, teamId and team role are required" });
    }
    const membership = await TeamMembershipModel.findOneAndUpdate(
      { userId, teamId },
      { $set: { role, assignedBy: req.user.sub } },
      { upsert: true, new: true, runValidators: true },
    );
    await UserModel.updateOne({ _id: userId }, { $set: { role }, $inc: { authVersion: 1 } });
    await writeAuditLog({
      req,
      actorId: req.user.sub,
      action: "team_role.assigned",
      resource: "team_membership",
      resourceId: `${teamId}:${userId}`,
      outcome: "allowed",
      metadata: { role },
    });
    return res.status(201).json({ success: true, data: membership });
  }
}
