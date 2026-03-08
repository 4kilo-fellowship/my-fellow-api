import { Request, Response } from "express";
import { UserModel } from "../models/user.model.js";
import EventModel from "../models/event.model.js";
import RegistrationModel from "../models/registration.model.js";
import { TransactionModel } from "../models/transaction.model.js";

export class AdminController {
  static async getAllUsers(req: Request, res: Response) {
    try {
      const page = Math.max(1, parseInt((req.query.page as string) || "1", 10));
      const limit = Math.max(
        1,
        parseInt((req.query.limit as string) || "20", 10),
      );
      const { search, team, department, yearOfStudy } = req.query;
      const skip = (page - 1) * limit;

      const query: any = {};

      if (search) {
        query.$or = [
          { fullName: { $regex: search, $options: "i" } },
          { phoneNumber: { $regex: search, $options: "i" } },
          { telegramUserName: { $regex: search, $options: "i" } },
        ];
      }

      if (team && team !== "all") query.team = team;
      if (department && department !== "all") query.department = department;
      if (yearOfStudy && yearOfStudy !== "all") query.yearOfStudy = yearOfStudy;

      const [users, total] = await Promise.all([
        UserModel.find(query)
          .select("-password")
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        UserModel.countDocuments(query),
      ]);

      return res.status(200).json({
        success: true,
        data: users,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error: any) {
      return res
        .status(500)
        .json({ success: false, message: error.message || "Server error" });
    }
  }

  static async getAllEvents(req: Request, res: Response) {
    try {
      const events = await EventModel.find().sort({ createdAt: -1 }).lean();
      return res.status(200).json({ success: true, data: events });
    } catch (error: any) {
      return res
        .status(500)
        .json({ success: false, message: error.message || "Server error" });
    }
  }

  static async getAllRegistrations(req: Request, res: Response) {
    try {
      const registrations = await RegistrationModel.find()
        .populate("userId", "-password")
        .populate("eventId")
        .sort({ createdAt: -1 })
        .lean();
      return res.status(200).json({ success: true, data: registrations });
    } catch (error: any) {
      return res
        .status(500)
        .json({ success: false, message: error.message || "Server error" });
    }
  }

  static async getAllTransactions(req: Request, res: Response) {
    try {
      const transactions = await TransactionModel.find()
        .populate("userId", "fullName phoneNumber")
        .sort({ createdAt: -1 })
        .lean();
      return res.status(200).json({ success: true, data: transactions });
    } catch (error: any) {
      return res
        .status(500)
        .json({ success: false, message: error.message || "Server error" });
    }
  }

  static async getStats(req: Request, res: Response) {
    try {
      const [userCount, eventCount, registrationCount, transactionCount] =
        await Promise.all([
          UserModel.countDocuments(),
          EventModel.countDocuments(),
          RegistrationModel.countDocuments(),
          TransactionModel.countDocuments(),
        ]);

      const [totalRevenueResult] = await TransactionModel.aggregate([
        { $match: { status: "pending" } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]);

      return res.status(200).json({
        success: true,
        data: {
          users: userCount,
          events: eventCount,
          registrations: registrationCount,
          transactions: transactionCount,
          totalRevenue: totalRevenueResult ? totalRevenueResult.total : 0,
        },
      });
    } catch (error: any) {
      return res
        .status(500)
        .json({ success: false, message: error.message || "Server error" });
    }
  }
}

export default AdminController;
