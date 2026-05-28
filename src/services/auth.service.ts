import mongoose from "mongoose";
import { IUserDocument, UserModel } from "../models/user.model.js";
import TeamModel from "../models/team.model.js";
import { SignInDTO, SignUpDTO } from "../types/types.js";
import { signJwt } from "../utils/jwt.js";
import { uploadImageToCloudinary } from "./cloudinary.service.js";

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
    const existing = await UserModel.findOne({ phoneNumber: dto.phoneNumber });
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
      phoneNumber: dto.phoneNumber,
      team: resolvedTeamId,
      department: dto.department ?? null,
      yearOfStudy: dto.yearOfStudy ?? null,
      telegramUserName: dto.telegramUserName ?? null,
      profileImage: profileImageUrl,
      password: dto.password,
      role:
        dto.phoneNumber === process.env.ADMIN_PHONE_NUMBER ? "admin" : "user",
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
}
