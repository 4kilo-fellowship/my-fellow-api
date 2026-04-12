import mongoose from "mongoose";
import JoinRequestModel from "../models/joinRequest.model.js";
import TeamModel from "../models/team.model.js";
import { UserModel } from "../models/user.model.js";

export class JoinRequestService {
  static async createRequest(data: {
    userId: string;
    teamId: string;
    fullName: string;
    phoneNumber: string;
    profileImage?: string;
    department: string;
    year: string;
    telegramHandle: string;
    message?: string;
  }) {
    const {
      userId,
      teamId,
      fullName,
      phoneNumber,
      profileImage,
      department,
      year,
      telegramHandle,
      message,
    } = data;

    // Check if team exists
    const team = await TeamModel.findById(teamId);
    if (!team || team.isDeleted) {
      throw new Error("Team not found");
    }

    // Check if user exists
    const user = await UserModel.findById(userId);
    if (!user) {
      throw new Error("User not found");
    }

    // Check for existing pending request
    const existingRequest = await JoinRequestModel.findOne({
      userId,
      teamId,
      status: "pending",
    });

    if (existingRequest) {
      throw new Error("A join request for this team is already pending");
    }

    const request = await JoinRequestModel.create({
      userId,
      teamId,
      fullName,
      phoneNumber,
      profileImage,
      department,
      year,
      telegramHandle,
      message,
    });

    return request;
  }

  static async updateStatus(
    requestId: string,
    status: "approved" | "rejected",
  ) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const request = await JoinRequestModel.findById(requestId);
      if (!request) {
        throw new Error("Join request not found");
      }

      if (request.status !== "pending") {
        throw new Error(`Request has already been ${request.status}`);
      }

      if (status === "approved") {
        // Update user's profile and team
        const user = await UserModel.findByIdAndUpdate(
          request.userId,
          {
            team: request.teamId.toString(),
            fullName: request.fullName,
            phoneNumber: request.phoneNumber,
            department: request.department,
            yearOfStudy: request.year,
            telegramUserName: request.telegramHandle,
            profileImage: request.profileImage,
          },
          { session },
        );

        if (!user) {
          throw new Error("User not found");
        }

        // Increment team's members count
        const team = await TeamModel.findByIdAndUpdate(
          request.teamId,
          { $inc: { members: 1 } },
          { session },
        );

        if (!team) {
          throw new Error("Team not found");
        }
      }

      request.status = status;
      await request.save({ session });

      await session.commitTransaction();
      return request;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  static async getRequests(filter: any = {}) {
    return await JoinRequestModel.find(filter)
      .populate("userId", "fullName phoneNumber profileImage")
      .populate("teamId", "name icon color")
      .sort({ createdAt: -1 });
  }

  static async getUserRequests(userId: string) {
    return await JoinRequestModel.find({ userId })
      .populate("teamId", "name icon color")
      .sort({ createdAt: -1 });
  }
}
