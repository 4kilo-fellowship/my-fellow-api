import mongoose, { Document, Model, Schema } from "mongoose";
import { PERMISSIONS, ROLES, Permission, Role } from "../rbac/permissions.js";

export interface IRoleGrant extends Document {
  userId: mongoose.Types.ObjectId;
  permission: Permission;
  grantedBy: mongoose.Types.ObjectId;
  expiresAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const RoleGrantSchema = new Schema<IRoleGrant>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    permission: { type: String, enum: PERMISSIONS, required: true },
    grantedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    expiresAt: { type: Date, default: null },
  },
  { timestamps: true },
);
RoleGrantSchema.index({ userId: 1, permission: 1 }, { unique: true });

export const RoleGrantModel: Model<IRoleGrant> =
  mongoose.models.RoleGrant ||
  mongoose.model<IRoleGrant>("RoleGrant", RoleGrantSchema);

export interface ITeamMembership extends Document {
  userId: mongoose.Types.ObjectId;
  teamId: mongoose.Types.ObjectId;
  role: Exclude<Role, "super_admin" | "leader" | "member">;
  assignedBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const TeamMembershipSchema = new Schema<ITeamMembership>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    teamId: { type: Schema.Types.ObjectId, ref: "Team", required: true },
    role: { type: String, enum: ["team_leader", "coordinator"], required: true },
    assignedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true },
);
TeamMembershipSchema.index({ userId: 1, teamId: 1 }, { unique: true });

export const TeamMembershipModel: Model<ITeamMembership> =
  mongoose.models.TeamMembership ||
  mongoose.model<ITeamMembership>("TeamMembership", TeamMembershipSchema);

export interface IAuditLog extends Document {
  actorId?: mongoose.Types.ObjectId | null;
  action: string;
  resource: string;
  resourceId?: string;
  permission?: string;
  outcome: "allowed" | "denied";
  ip?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

const AuditLogSchema = new Schema<IAuditLog>(
  {
    actorId: { type: Schema.Types.ObjectId, ref: "User", default: null },
    action: { type: String, required: true, trim: true },
    resource: { type: String, required: true, trim: true },
    resourceId: { type: String, trim: true },
    permission: { type: String, trim: true },
    outcome: { type: String, enum: ["allowed", "denied"], required: true },
    ip: { type: String, trim: true },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);
AuditLogSchema.index({ createdAt: -1 });
AuditLogSchema.index({ actorId: 1, createdAt: -1 });

export const AuditLogModel: Model<IAuditLog> =
  mongoose.models.AuditLog ||
  mongoose.model<IAuditLog>("AuditLog", AuditLogSchema);
