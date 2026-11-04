import "dotenv/config";
import mongoose from "mongoose";
import { UserModel } from "../src/models/user.model.js";
import { AuthService } from "../src/services/auth.service.js";

const mongoUri = process.env.MONGO_URI;
if (!mongoUri) {
  console.error("MONGO_URI environment variable is required.");
  process.exit(1);
}

const inputPhone = process.argv[2] || "0900000001";
const normalizedPhone = AuthService.normalizePhone(inputPhone);

console.log(`Connecting to MongoDB to promote user with phone: ${inputPhone} (normalized: ${normalizedPhone})...`);

await mongoose.connect(mongoUri);

try {
  // Search by exact normalized phone, raw phone, or regex
  const user = await UserModel.findOne({
    $or: [
      { phoneNumber: normalizedPhone },
      { phoneNumber: inputPhone },
      { phoneNumber: new RegExp(inputPhone.replace(/^0/, "")) },
    ],
  });

  if (!user) {
    console.error(`User with phone ${inputPhone} was not found in the database.`);
    console.log("Recent users in database:");
    const recent = await UserModel.find({}, "fullName phoneNumber role").limit(10);
    console.log(recent);
    process.exit(1);
  }

  const previousRole = user.role;
  user.role = "super_admin";
  user.authVersion = (user.authVersion || 0) + 1;
  await user.save();

  console.log("--------------------------------------------------");
  console.log("SUCCESS: User promoted to SUPER ADMIN!");
  console.log(`ID:           ${user._id}`);
  console.log(`Name:         ${user.fullName || "(unnamed)"}`);
  console.log(`Phone:        ${user.phoneNumber}`);
  console.log(`Previous Role:${previousRole}`);
  console.log(`New Role:     ${user.role}`);
  console.log(`Auth Version: ${user.authVersion}`);
  console.log("--------------------------------------------------");
} catch (err) {
  console.error("Error setting super admin:", err);
  process.exit(1);
} finally {
  await mongoose.disconnect();
}
