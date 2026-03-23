import { UserModel, IUserDocument } from "../models/user.model.js";
import { SignUpDTO, SignInDTO } from "../types/types.js";
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

    const user = new UserModel({
      fullName: dto.fullName,
      phoneNumber: dto.phoneNumber,
      team: dto.team ?? null,
      department: dto.department ?? null,
      yearOfStudy: dto.yearOfStudy ?? null,
      telegramUserName: dto.telegramUserName ?? null,
      profileImage: profileImageUrl,
      pastTeam: dto.pastTeam ?? null,
      password: dto.password,
      role:
        dto.phoneNumber === process.env.ADMIN_PHONE_NUMBER ? "admin" : "user",
    });

    await user.save();
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
      pastTeam: user.pastTeam,
      createdAt: user.createdAt,
    };

    return { user: safeUser, token };
  }

  static async login(dto: SignInDTO) {
    const phone = AuthService.normalizePhone(dto.phoneNumber);
    const user = await UserModel.findOne({ phoneNumber: phone });
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
      pastTeam: user.pastTeam,
      createdAt: user.createdAt,
    };

    return { user: safeUser, token };
  }

  static async lookupByPhoneNumber(phoneNumber: string) {
    const phone = AuthService.normalizePhone(phoneNumber);
    const user = await UserModel.findOne({ phoneNumber: phone });
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
      pastTeam: user.pastTeam,
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
    return UserModel.findById(id).select("-password");
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
      pastTeam: user.pastTeam,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    return safeUser;
  }
}
