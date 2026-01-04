import { UserModel, IUserDocument } from "../models/user.model.js";
import { SignUpDTO, SignInDTO } from "../types/user.js";
import { signJwt } from "../utils/jwt.js";

export class AuthService {
  static async register(dto: SignUpDTO) {
    const existing = await UserModel.findOne({ phoneNumber: dto.phoneNumber });
    if (existing) {
      throw new Error("Phone number already registered.");
    }

    const user = new UserModel({
      fullName: dto.fullName,
      phoneNumber: dto.phoneNumber,
      team: dto.team ?? null,
      department: dto.department ?? null,
      yearOfStudy: dto.yearOfStudy ?? null,
      telegramUserName: dto.telegramUserName ?? null,
      password: dto.password,
    });

    await user.save();
    const token = signJwt({ sub: user._id, phoneNumber: user.phoneNumber });

    const safeUser = {
      id: user._id,
      fullName: user.fullName,
      phoneNumber: user.phoneNumber,
      team: user.team,
      department: user.department,
      yearOfStudy: user.yearOfStudy,
      telegramUserName: user.telegramUserName,
      createdAt: user.createdAt,
    };

    return { user: safeUser, token };
  }

  static async login(dto: SignInDTO) {
    const user = await UserModel.findOne({ phoneNumber: dto.phoneNumber });
    if (!user) {
      throw new Error("Invalid credentials");
    }

    const valid = await user.comparePassword(dto.password);
    if (!valid) {
      throw new Error("Invalid credentials");
    }
    const token = signJwt({ sub: user._id, phoneNumber: user.phoneNumber });

    const safeUser = {
      id: user._id,
      fullName: user.fullName,
      phoneNumber: user.phoneNumber,
      team: user.team,
      department: user.department,
      yearOfStudy: user.yearOfStudy,
      telegramUserName: user.telegramUserName,
      createdAt: user.createdAt,
    };

    return { user: safeUser, token };
  }

  static async findById(id: string): Promise<IUserDocument | null> {
    return UserModel.findById(id).select("-password");
  }
}
