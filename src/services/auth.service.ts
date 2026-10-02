import mongoose from "mongoose";
import { IUserDocument, UserModel } from "../models/user.model.js";
import TeamModel from "../models/team.model.js";
import { OtpRecordModel } from "../models/otp.model.js";
import { SignInDTO, SignUpDTO } from "../types/types.js";
import { signJwt } from "../utils/jwt.js";
import { uploadImageToCloudinary } from "./cloudinary.service.js";
import { OtpService, toLocalPhone } from "./otp.service.js";

export class AuthService {
  static normalizePhone(phone: string): string {
    let n = phone.replace(/\D/g, "");
    if (n.startsWith("251") && n.length >= 12) {
      n = "0" + n.substring(3);
    } else if (n.length === 9 && (n.startsWith("9") || n.startsWith("7"))) {
      n = "0" + n;
    }
    return n;
  }

  static async register(dto: SignUpDTO, file?: Express.Multer.File) {
    const normalizedPhone = AuthService.normalizePhone(dto.phoneNumber);
    const existing = await UserModel.findOne({ phoneNumber: normalizedPhone });
    if (existing) {
      throw new Error("Phone number already registered.");
    }

    let profileImageUrl: string | null = null;

    if (file && file.buffer) {
      try {
        const uploadResult = await uploadImageToCloudinary(file.buffer, {
          folder: "profile-images",
          transformation: {
            width: 500,
            height: 500,
            crop: "fill",
            quality: "auto",
          },
        });
        profileImageUrl = uploadResult.secure_url;
      } catch (error: any) {
        throw new Error(
          `Failed to upload image: ${error.message || "Image upload error"}`,
        );
      }
    }

    let resolvedTeamId: mongoose.Types.ObjectId | null = null;
    if (dto.team) {
      if (mongoose.Types.ObjectId.isValid(dto.team)) {
        // If the client supplied an ObjectId, make sure it actually exists
        // and is not deleted before assigning it. Do not accept arbitrary
        // ObjectIds which would create dangling references.
        const existingById = await TeamModel.findOne({
          _id: dto.team,
          isDeleted: false,
        });
        if (existingById) {
          resolvedTeamId = existingById._id as mongoose.Types.ObjectId;
        } else {
          console.info(
            `Team id '${dto.team}' not found; will not assign team to user.`,
          );
          resolvedTeamId = null;
        }
      } else {
        const teamObj = await TeamModel.findOne({
          name: { $regex: new RegExp("^" + dto.team + "$", "i") },
          isDeleted: false,
        });
        if (teamObj) {
          resolvedTeamId = teamObj._id as mongoose.Types.ObjectId;
        } else {
          // Don't auto-create teams when a user supplies a team name that
          // doesn't exist. Per product requirements, users should not cause
          // new empty teams to be created during profile/registration.
          // Leave team as null so they can join existing teams later.
          console.info(
            `Team '${dto.team}' not found; skipping automatic creation.`,
          );
          resolvedTeamId = null;
        }
      }
    }

    const user = new UserModel({
      fullName: dto.fullName,
      phoneNumber: normalizedPhone,
      team: resolvedTeamId,
      department: dto.department ?? null,
      yearOfStudy: dto.yearOfStudy ?? null,
      telegramUserName: dto.telegramUserName ?? null,
      profileImage: profileImageUrl,
      password: dto.password,
      role:
        normalizedPhone === process.env.ADMIN_PHONE_NUMBER ? "admin" : "user",
    });

    await user.save();
    await user.populate("team", "name");
    const token = signJwt({
      sub: user._id,
      phoneNumber: user.phoneNumber,
      role: user.role,
    });

    const safeUser = {
      id: user._id,
      fullName: user.fullName,
      phoneNumber: user.phoneNumber,
      role: user.role,
      team: user.team,
      department: user.department,
      yearOfStudy: user.yearOfStudy,
      telegramUserName: user.telegramUserName,
      profileImage: user.profileImage,
      createdAt: user.createdAt,
    };

    return { user: safeUser, token };
  }

  static async login(dto: SignInDTO) {
    const phone = AuthService.normalizePhone(dto.phoneNumber);
    const user = await UserModel.findOne({ phoneNumber: phone }).populate(
      "team",
      "name",
    );
    if (!user) {
      throw new Error("Invalid credentials");
    }

    const valid = await user.comparePassword(dto.password);
    if (!valid) {
      throw new Error("Invalid credentials");
    }
    const token = signJwt({
      sub: user._id,
      phoneNumber: user.phoneNumber,
      role: user.role,
    });

    const safeUser = {
      id: user._id,
      fullName: user.fullName,
      phoneNumber: user.phoneNumber,
      role: user.role,
      team: user.team,
      department: user.department,
      yearOfStudy: user.yearOfStudy,
      telegramUserName: user.telegramUserName,
      profileImage: user.profileImage,
      createdAt: user.createdAt,
    };

    return { user: safeUser, token };
  }

  static async lookupByPhoneNumber(phoneNumber: string) {
    const phone = AuthService.normalizePhone(phoneNumber);
    const user = await UserModel.findOne({ phoneNumber: phone }).populate(
      "team",
      "name",
    );
    if (!user) {
      throw new Error("User not found");
    }

    const safeUser = {
      id: user._id,
      fullName: user.fullName,
      phoneNumber: user.phoneNumber,
      role: user.role,
      team: user.team,
      department: user.department,
      yearOfStudy: user.yearOfStudy,
      telegramUserName: user.telegramUserName,
      profileImage: user.profileImage,
      createdAt: user.createdAt,
    };

    return { user: safeUser };
  }

  static async findByPhoneNumber(
    phoneNumber: string,
  ): Promise<IUserDocument | null> {
    return UserModel.findOne({ phoneNumber }).select("-password");
  }

  static async findById(id: string): Promise<IUserDocument | null> {
    return UserModel.findById(id).select("-password").populate("team", "name");
  }

  static async updateProfile(
    userId: string,
    updates: any,
    file?: Express.Multer.File,
  ) {
    const user = await UserModel.findById(userId);
    if (!user) {
      throw new Error("User not found");
    }

    if (file && file.buffer) {
      try {
        const uploadResult = await uploadImageToCloudinary(file.buffer, {
          folder: "profile-images",
          transformation: {
            width: 500,
            height: 500,
            crop: "fill",
            quality: "auto",
          },
        });
        updates.profileImage = uploadResult.secure_url;
      } catch (error: any) {
        throw new Error(
          `Failed to upload image: ${error.message || "Image upload error"}`,
        );
      }
    }

    Object.keys(updates).forEach((key) => {
      if (updates[key] !== undefined) {
        (user as any)[key] = updates[key];
      }
    });

    await user.save();
    await user.populate("team", "name");

    const safeUser = {
      id: user._id,
      fullName: user.fullName,
      phoneNumber: user.phoneNumber,
      role: user.role,
      team: user.team,
      department: user.department,
      yearOfStudy: user.yearOfStudy,
      telegramUserName: user.telegramUserName,
      profileImage: user.profileImage,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    return safeUser;
  }

  static async updatePhone(
    userId: string,
    dto: { phoneNumber: string; password: string },
  ) {
    const normalizedPhone = AuthService.normalizePhone(dto.phoneNumber);
    const user = await UserModel.findById(userId);
    if (!user) {
      throw new Error("User not found");
    }

    const valid = await user.comparePassword(dto.password);
    if (!valid) {
      throw new Error("Invalid password");
    }

    const existing = await UserModel.findOne({ phoneNumber: normalizedPhone });
    if (existing && String(existing._id) !== String(user._id)) {
      throw new Error("Phone number already registered.");
    }

    user.phoneNumber = normalizedPhone;
    user.role =
      normalizedPhone === process.env.ADMIN_PHONE_NUMBER ? "admin" : "user";
    await user.save();
    await user.populate("team", "name");

    const token = signJwt({
      sub: user._id,
      phoneNumber: user.phoneNumber,
      role: user.role,
    });

    const safeUser = {
      id: user._id,
      fullName: user.fullName,
      phoneNumber: user.phoneNumber,
      role: user.role,
      team: user.team,
      department: user.department,
      yearOfStudy: user.yearOfStudy,
      telegramUserName: user.telegramUserName,
      profileImage: user.profileImage,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    return { user: safeUser, token };
  }

  static async requestOtp(phoneNumber: string, purpose: "signup" | "reset-password" = "signup") {
    const normalizedPhone = toLocalPhone(phoneNumber);

    if (purpose === "reset-password") {
      const existingUser = await UserModel.findOne({ phoneNumber: normalizedPhone });
      if (!existingUser) {
        throw new Error("No account found with this phone number.");
      }
    } else if (purpose === "signup") {
      const existingUser = await UserModel.findOne({ phoneNumber: normalizedPhone });
      if (existingUser) {
        throw new Error("Phone number already registered.");
      }
    }

    // Rate-limit: Check if an active OTP was requested recently (less than 60 seconds ago)
    const recentRecord = await OtpRecordModel.findOne({
      phoneNumber: normalizedPhone,
      purpose,
      createdAt: { $gt: new Date(Date.now() - 60 * 1000) },
    });

    if (recentRecord) {
      throw new Error("Please wait 60 seconds before requesting another code.");
    }

    // Invalidate any prior active codes for this phone & purpose
    await OtpRecordModel.deleteMany({
      phoneNumber: normalizedPhone,
      purpose,
    });

    const code = OtpService.generateSecureCode(6);
    const codeHash = OtpService.hashSecret(code);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    await OtpRecordModel.create({
      phoneNumber: normalizedPhone,
      codeHash,
      purpose,
      expiresAt,
    });

    await OtpService.sendOtpSms(normalizedPhone, code, purpose);

    return {
      success: true,
      message: "Verification code sent successfully",
      phoneNumber: normalizedPhone,
      expiresIn: 300,
    };
  }

  static async verifyOtp(
    phoneNumber: string,
    code: string,
    purpose: "signup" | "reset-password" = "signup"
  ) {
    const normalizedPhone = toLocalPhone(phoneNumber);

    const record = await OtpRecordModel.findOne({
      phoneNumber: normalizedPhone,
      purpose,
      expiresAt: { $gt: new Date() },
    });

    if (!record) {
      throw new Error("Verification code has expired or was not requested. Please request a new code.");
    }

    if (record.attempts >= record.maxAttempts) {
      await OtpRecordModel.deleteOne({ _id: record._id });
      throw new Error("Too many failed attempts. For your security, this code has been revoked.");
    }

    const inputHash = OtpService.hashSecret(code.trim());
    const isValid = OtpService.timingSafeEqual(inputHash, record.codeHash);

    if (!isValid) {
      record.attempts += 1;
      await record.save();
      const remaining = record.maxAttempts - record.attempts;
      throw new Error(
        remaining > 0
          ? `Invalid verification code. ${remaining} attempt(s) remaining.`
          : "Invalid verification code. Maximum attempts exceeded."
      );
    }

    // Generate a secure single-use verification token
    const verificationToken = OtpService.generateSecureToken();
    record.verifiedAt = new Date();
    record.verificationToken = OtpService.hashSecret(verificationToken);
    await record.save();

    return {
      success: true,
      message: "Phone number verified successfully",
      verificationToken,
      phoneNumber: normalizedPhone,
    };
  }

  static async resetPasswordWithOtp(
    phoneNumber: string,
    verificationToken: string,
    newPassword: string
  ) {
    const normalizedPhone = toLocalPhone(phoneNumber);
    const tokenHash = OtpService.hashSecret(verificationToken);

    const record = await OtpRecordModel.findOne({
      phoneNumber: normalizedPhone,
      purpose: "reset-password",
      verificationToken: tokenHash,
      verifiedAt: { $ne: null },
      expiresAt: { $gt: new Date() },
    });

    if (!record) {
      throw new Error("Invalid or expired password reset session. Please request a new verification code.");
    }

    const user = await UserModel.findOne({ phoneNumber: normalizedPhone });
    if (!user) {
      throw new Error("User account not found.");
    }

    user.password = newPassword;
    await user.save();

    // Consume the token so it cannot be used again
    await OtpRecordModel.deleteOne({ _id: record._id });

    const token = signJwt({
      sub: user._id,
      phoneNumber: user.phoneNumber,
      role: user.role,
    });

    return {
      success: true,
      message: "Password reset successfully. You are now logged in.",
      token,
      user: {
        id: user._id,
        fullName: user.fullName,
        phoneNumber: user.phoneNumber,
        role: user.role,
        team: user.team,
        department: user.department,
        yearOfStudy: user.yearOfStudy,
        telegramUserName: user.telegramUserName,
        profileImage: user.profileImage,
      },
    };
  }
}

