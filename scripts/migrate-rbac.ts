import "dotenv/config";
import mongoose from "mongoose";
import { UserModel } from "../src/models/user.model.js";
import { RoleGrantModel } from "../src/models/rbac.model.js";
import { ROLES, Role } from "../src/rbac/permissions.js";

const mongoUri = process.env.MONGO_URI;
if (!mongoUri) throw new Error("MONGO_URI is required");

const requestedSuperAdminId = process.argv
  .find((arg) => arg.startsWith("--super-admin-id="))
  ?.split("=")[1];

const roleMap: Record<string, Role> = {
  admin: "leader",
  user: "member",
};

await mongoose.connect(mongoUri);
try {
  const legacyAdmins = await UserModel.find({ role: "admin" }).select("_id");
  let superAdminId = requestedSuperAdminId;
  if (!superAdminId) {
    if (legacyAdmins.length !== 1) {
      throw new Error(
        `Refusing ambiguous migration: found ${legacyAdmins.length} legacy admins. Re-run with --super-admin-id=<Mongo user id>.`,
      );
    }
    superAdminId = String(legacyAdmins[0]._id);
  }

  const superAdmin = await UserModel.findById(superAdminId).select("_id role");
  if (!superAdmin) throw new Error("Requested Super Admin user was not found");
  if (!legacyAdmins.some((user) => String(user._id) === superAdminId)) {
    throw new Error("The selected Super Admin must currently have role=admin");
  }

  const users = await UserModel.find({
    role: { $in: [...ROLES, "admin", "user"] },
  }).select("_id role");

  for (const user of users) {
    const oldRole = String(user.role);
    const nextRole = String(user._id) === superAdminId
      ? "super_admin"
      : roleMap[oldRole] ?? oldRole;
    if (nextRole !== oldRole) {
      await UserModel.updateOne(
        { _id: user._id },
        { $set: { role: nextRole, authVersion: user.authVersion + 1 } },
      );
    }
  }

  await RoleGrantModel.deleteMany({ expiresAt: { $lte: new Date() } });
  console.log(`Migrated ${users.length} users. Super Admin: ${superAdminId}`);
} finally {
  await mongoose.disconnect();
}
