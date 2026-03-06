import { Request, Response } from "express";
import { UserModel } from "../models/user.model.js";
import EventModel from "../models/event.model.js";
import RegistrationModel from "../models/registration.model.js";
import { TransactionModel } from "../models/transaction.model.js";

export class AdminController {
  static async getAllUsers(req: Request, res: Response) {
    try {
      const users = await UserModel.find().select("-password").lean();
      return res.status(200).json({ success: true, data: users });
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
