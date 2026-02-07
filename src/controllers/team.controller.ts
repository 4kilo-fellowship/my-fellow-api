import { Request, Response } from "express";
import { TeamService } from "../services/team.service.js";
import {
  createTeamInputSchema,
  updateTeamInputSchema,
} from "../validators/team.validator.js";

export class TeamController {
  static async createTeam(req: Request, res: Response) {
    try {
      // Zod validation
      // req.body might contain stringified versions of objects if multipart
      // The validator's preprocess handles JSON.parse for coordinates/leader
      const parseResult = createTeamInputSchema.safeParse(req.body);

      if (!parseResult.success) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: parseResult.error.format(),
        });
      }

      const team = await TeamService.create(parseResult.data, req.file);

      return res.status(201).json({
        success: true,
        message: "Team created successfully",
        data: team,
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message || "Server error",
      });
    }
  }

  static async getAllTeams(req: Request, res: Response) {
    try {
      const teams = await TeamService.getAll(req.query);
      return res.status(200).json({
        success: true,
        data: teams,
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message || "Server error",
      });
    }
  }

  static async getTeamById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const team = await TeamService.getById(id);

      if (!team) {
        return res.status(404).json({
          success: false,
          message: "Team not found",
        });
      }

      return res.status(200).json({
        success: true,
        data: team,
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message || "Server error",
      });
    }
  }

  static async updateTeam(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const parseResult = updateTeamInputSchema.safeParse(req.body);

      if (!parseResult.success) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: parseResult.error.format(),
        });
      }

      const updatedTeam = await TeamService.update(
        id,
        parseResult.data,
        req.file,
      );

      if (!updatedTeam) {
        return res.status(404).json({
          success: false,
          message: "Team not found",
        });
      }

      return res.status(200).json({
        success: true,
        message: "Team updated successfully",
        data: updatedTeam,
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message || "Server error",
      });
    }
  }

  static async deleteTeam(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const deletedTeam = await TeamService.delete(id);

      if (!deletedTeam) {
        return res.status(404).json({
          success: false,
          message: "Team not found",
        });
      }

      return res.status(200).json({
        success: true,
        message: "Team deleted successfully",
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message || "Server error",
      });
    }
  }
}

export default TeamController;
