import "dotenv/config";
import mongoose from "mongoose";
import { UserModel } from "../src/models/user.model.js";
import { RoleGrantModel, TeamMembershipModel } from "../src/models/rbac.model.js";

const mongoUri = process.env.MONGO_URI;
if (!mongoUri) throw new Error("MONGO_URI is required");

await mongoose.connect(mongoUri);
try {
  const users = await UserModel.find({
    role: { $in: ["super_admin", "leader", "team_leader", "coordinator", "member"] },
  }).select("_id role authVersion");
  for (const user of users) {
    const role = user.role === "super_admin" || user.role === "leader"
      ? "admin"
      : "user";
    await UserModel.updateOne(
      { _id: user._id },
      { $set: { role }, $inc: { authVersion: 1 } },
    );
  }
  await Promise.all([
    RoleGrantModel.deleteMany({}),
    TeamMembershipModel.deleteMany({}),
  ]);
  console.log(`Rolled back ${users.length} users to legacy roles.`);
} finally {
  await mongoose.disconnect();
}
