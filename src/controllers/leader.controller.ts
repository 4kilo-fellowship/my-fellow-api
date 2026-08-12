import { Request, Response } from "express";
import { LeaderService } from "../services/leader.service.js";
import { leaderBaseSchema } from "../validators/leader.validator.js";
import { routeParam } from "../utils/routeParam.js";

export class LeaderController {
  private static parseMultipartBody(body: any): any {
    const data = { ...body };
    const booleanFields = ["isVerified"];

    booleanFields.forEach((field) => {
      if (typeof data[field] === "string") {
        data[field] = data[field] === "true";
      }
    });

    return data;
  }

  static async createLeader(req: Request, res: Response) {
    try {
      let data = LeaderController.parseMultipartBody(req.body);

      const parseResult = leaderBaseSchema.safeParse(data);

      if (!parseResult.success) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: parseResult.error.format(),
        });
      }

      const leader = await LeaderService.create(parseResult.data, req.file);

      return res.status(201).json({
        success: true,
        message: "Leader created successfully",
        data: leader,
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message || "Server error",
      });
    }
  }

  static async getAllLeaders(req: Request, res: Response) {
    try {
      const query = {
        type: (req.query.type as string) || undefined,
        search: (req.query.search as string) || undefined,
      };

      const leaders = await LeaderService.getAll(query);

      return res.status(200).json({
        success: true,
        data: leaders,
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message || "Server error",
      });
    }
  }

  static async getLeaderById(req: Request, res: Response) {
    try {
      const id = routeParam(req.params.id);
      const leader = await LeaderService.getById(id);

      if (!leader) {
        return res.status(404).json({
          success: false,
          message: "Leader not found",
        });
      }

      return res.status(200).json({
        success: true,
        data: leader,
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message || "Server error",
      });
    }
  }

  static async updateLeader(req: Request, res: Response) {
    try {
      let data = LeaderController.parseMultipartBody(req.body);

      const parseResult = leaderBaseSchema.partial().safeParse(data);

      if (!parseResult.success) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: parseResult.error.format(),
        });
      }

      const id = routeParam(req.params.id);

      const updatedLeader = await LeaderService.update(
        id,
        parseResult.data,
        req.file,
      );

      if (!updatedLeader) {
        return res.status(404).json({
          success: false,
          message: "Leader not found",
        });
      }

      return res.status(200).json({
        success: true,
        message: "Leader updated successfully",
        data: updatedLeader,
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message || "Server error",
      });
    }
  }

  static async deleteLeader(req: Request, res: Response) {
    try {
      const id = routeParam(req.params.id);
      const success = await LeaderService.delete(id);

      if (!success) {
        return res.status(404).json({
          success: false,
          message: "Leader not found",
        });
      }

      return res.status(200).json({
        success: true,
        message: "Leader deleted successfully",
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message || "Server error",
      });
    }
  }
}

export default LeaderController;
