import { Request, Response } from "express";
import { TeamService } from "../services/team.service.js";
import { teamBaseSchema } from "../validators/team.validator.js";

export class TeamController {
  static async createTeam(req: Request, res: Response) {
    try {
      const data = { ...req.body };

      // Preprocess JSON string fields for multipart requests
      if (typeof data.coordinates === "string") {
        try {
          data.coordinates = JSON.parse(data.coordinates);
        } catch (e) {
          // Leave it as string, validator will fail and report error
        }
      }

      if (typeof data.leader === "string") {
        try {
          data.leader = JSON.parse(data.leader);
        } catch (e) {
          // Leave it as string, validator will fail
        }
      }

      // If a file is uploaded but no imageUrl in body, we might set a placeholder or let service handle it.
      // However, teamBaseSchema requires imageUrl to be a valid URL string.
      // If we are uploading a file, we generate the URL in the service.
      // But validation happens BEFORE service.
      // We must inject a placeholder if a file is present to pass validation,
      // OR we adjust the validation strategy.
      // Since user said "use just what is there in validators", and validator requires imageUrl as URL.
      // If user uploads file, frontend might send 'imageUrl' as empty string or not send it.
      // If req.file is present, let's inject a placeholder string so Zod passes,
      // then Service will replace it with actual Cloudinary URL.
      if (req.file && (!data.imageUrl || data.imageUrl === "")) {
        data.imageUrl = "https://placeholder.com/image.jpg";
      }

      const parseResult = teamBaseSchema.safeParse(data);

      if (!parseResult.success) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: parseResult.error.format(),
        });
      }

      // Pass the REAL data to service.
      // If we injected a placeholder, we must ensure Service overwrites it from req.file.
      // Service logic: "let imageUrl = data.imageUrl; if (file) ... imageUrl = uploadResult.secure_url"
      // This works perfectly.

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
      const data = { ...req.body };

      // Preprocess JSON string fields
      if (typeof data.coordinates === "string") {
        try {
          data.coordinates = JSON.parse(data.coordinates);
        } catch (e) {}
      }

      if (typeof data.leader === "string") {
        try {
          data.leader = JSON.parse(data.leader);
        } catch (e) {}
      }

      // If file uploaded, allow imageUrl valid pass
      if (req.file && (!data.imageUrl || data.imageUrl === "")) {
        data.imageUrl = "https://placeholder.com/image.jpg";
      }

      // Use partial() for updates
      const parseResult = teamBaseSchema.partial().safeParse(data);

      if (!parseResult.success) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: parseResult.error.format(),
        });
      }

      // Cast to any to satisfy TS constraint if Service expects full type (we'll fix service next)
      // or if Service accepts Partial<Team>.
      const updatedTeam = await TeamService.update(
        id,
        parseResult.data as any,
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
