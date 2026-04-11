import { Request, Response } from "express";
import { TeamService } from "../services/team.service.js";
import { teamBaseSchema, Team } from "../validators/team.validator.js";

export class TeamController {
  private static parseMultipartBody(body: any): any {
    const data = { ...body };
    const jsonFields = ["coordinates", "leader"];

    jsonFields.forEach((field) => {
      if (typeof data[field] === "string") {
        try {
          data[field] = JSON.parse(data[field]);
        } catch (e) {
          // parsing fails
        }
      }
    });

    return data;
  }

  private static ensureImageUrlForValidator(
    data: any,
    files?: { [fieldname: string]: Express.Multer.File[] },
  ): any {
    if (files?.["image"]?.[0] && (!data.imageUrl || data.imageUrl === "")) {
      data.imageUrl = "https://placeholder.com/image.jpg";
    }
    if (files?.["leaderImage"]?.[0]) {
      if (!data.leader) data.leader = {};
      if (!data.leader.imageUrl || data.leader.imageUrl === "") {
        data.leader.imageUrl = "https://placeholder.com/leader.jpg";
      }
    }
    return data;
  }

  static async createTeam(req: Request, res: Response) {
    try {
      let data = TeamController.parseMultipartBody(req.body);
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      data = TeamController.ensureImageUrlForValidator(data, files);

      const parseResult = teamBaseSchema.safeParse(data);

      if (!parseResult.success) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: parseResult.error.format(),
        });
      }

      const team = await TeamService.create(parseResult.data, files);

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
      const query = {
        category: (req.query.category as string) || undefined,
        search: (req.query.search as string) || undefined,
      };

      const teams = await TeamService.getAll(query);

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
      let data = TeamController.parseMultipartBody(req.body);

      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      data = TeamController.ensureImageUrlForValidator(data, files);

      const parseResult = teamBaseSchema.partial().safeParse(data);

      if (!parseResult.success) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: parseResult.error.format(),
        });
      }

      const { id } = req.params;

      const updatedTeam = await TeamService.update(id, parseResult.data, files);

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
      console.error(error);
      return res.status(500).json({
        success: false,
        message: error.message || "Server error",
      });
    }
  }

  static async deleteTeam(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const success = await TeamService.delete(id);

      if (!success) {
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
