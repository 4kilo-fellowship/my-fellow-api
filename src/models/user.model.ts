import mongoose, { Schema, Document, Model } from "mongoose";
import bcrypt from "bcrypt";

export interface IUser {
  fullName: string;
  phoneNumber: string;
  team?: string | null;
  department?: string | null;
  yearOfStudy?: string | null;
  telegramUserName?: string | null;
  profileImage?: string | null;
  password: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IUserDocument extends IUser, Document {
  comparePassword(candidate: string): Promise<boolean>;
}

const UserSchema = new Schema<IUserDocument>(
  {
    fullName: { type: String, required: true, trim: true },
    phoneNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    team: { type: String, default: null },
    department: { type: String, default: null },
    yearOfStudy: { type: String, default: null },
    telegramUserName: { type: String, default: null },
    profileImage: { type: String, default: null },
    password: { type: String, required: true, minlength: 6 },
  },
  { timestamps: true }
);

UserSchema.pre<IUserDocument>("save", async function () {
  if (!this.isModified("password")) return;

  // hash the password
  const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS || "12", 10);
  this.password = await bcrypt.hash(this.password, saltRounds);
});

UserSchema.methods.comparePassword = function (candidate: string) {
  return bcrypt.compare(candidate, this.password);
};

export const UserModel: Model<IUserDocument> =
  mongoose.models.User || mongoose.model<IUserDocument>("User", UserSchema);
