import { Request } from "express";
import mongoose from "mongoose";
import { AuditLogModel } from "../models/rbac.model.js";

export async function writeAuditLog(input: {
  req?: Request;
  actorId?: string | null;
  action: string;
  resource: string;
  resourceId?: string;
  permission?: string;
  outcome: "allowed" | "denied";
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const actorId =
    input.actorId && mongoose.isValidObjectId(input.actorId)
      ? new mongoose.Types.ObjectId(input.actorId)
      : null;

  await AuditLogModel.create({
    actorId,
    action: input.action,
    resource: input.resource,
    resourceId: input.resourceId,
    permission: input.permission,
    outcome: input.outcome,
    ip: input.req?.ip,
    metadata: input.metadata,
  });
}
