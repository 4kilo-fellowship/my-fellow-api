import mongoose from "mongoose";
import WriterRequestModel from "../models/writerRequest.model.js";
import { UserModel } from "../models/user.model.js";

export class WriterRequestService {
  static async createRequest(data: {
    userId: string;
    fullName: string;
    phoneNumber: string;
    telegramHandle: string;
    department?: string;
    year?: string;
    sampleTopic: string;
    message?: string;
  }) {
    const {
      userId,
      fullName,
      phoneNumber,
      telegramHandle,
      department,
      year,
      sampleTopic,
      message,
    } = data;

    // Check if user exists
    const user = await UserModel.findById(userId);
    if (!user) {
      throw new Error("User not found");
    }

    // Check if user already has a pending application
    const existing = await WriterRequestModel.findOne({
      userId,
      status: "pending",
    });

    if (existing) {
      throw new Error("You already have a pending application to write devotions");
    }

    const request = await WriterRequestModel.create({
      userId: new mongoose.Types.ObjectId(userId),
      fullName,
      phoneNumber,
      telegramHandle,
      department,
      year,
      sampleTopic,
      message,
      status: "pending",
    });

    return request;
  }

  static async getMyRequest(userId: string) {
    const request = await WriterRequestModel.findOne({ userId }).sort({
      createdAt: -1,
    });
    return request;
  }

  static async getAllRequests(options: {
    status?: "pending" | "approved" | "rejected";
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(1, Number(options.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(options.limit) || 20));
    const skip = (page - 1) * limit;

    const query: Record<string, any> = {};
    if (options.status) {
      query.status = options.status;
    }

    const [requests, total] = await Promise.all([
      WriterRequestModel.find(query)
        .populate("userId", "fullName phoneNumber email profileImage department academicYear telegramUsername")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      WriterRequestModel.countDocuments(query),
    ]);

    return {
      requests,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  static async updateStatus(
    requestId: string,
    status: "approved" | "rejected",
    adminId?: string,
    adminNotes?: string
  ) {
    if (!["approved", "rejected"].includes(status)) {
      throw new Error("Invalid status. Must be approved or rejected");
    }

    const request = await WriterRequestModel.findById(requestId);
    if (!request) {
      throw new Error("Writer application request not found");
    }

    request.status = status;
    if (adminNotes !== undefined) {
      request.adminNotes = adminNotes;
    }
    if (adminId) {
      request.reviewedBy = new mongoose.Types.ObjectId(adminId);
      request.reviewedAt = new Date();
    }

    await request.save();
    return request;
  }
}

export default WriterRequestService;
