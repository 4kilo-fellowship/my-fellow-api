import JoinRequestModel from "../models/joinRequest.model.js";
import { UserModel } from "../models/user.model.js";
import TeamModel from "../models/team.model.js";
import mongoose from "mongoose";

export class JoinRequestService {
  static async createRequest(userId: string, teamId: string, message?: string) {
    // Check if team exists
    const team = await TeamModel.findById(teamId);
    if (!team || team.isDeleted) {
      throw new Error("Team not found");
    }

    // Check if user already in a team (optional, depending on requirements)
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
        // Update user's team
        const user = await UserModel.findByIdAndUpdate(
          request.userId,
          { team: request.teamId.toString() },
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
