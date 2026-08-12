import { Request, Response } from "express";
import { ProgramService } from "../services/program.service.js";
import { programBaseSchema } from "../validators/program.validator.js";
import { routeParam } from "../utils/routeParam.js";

export class ProgramController {
  private static parseMultipartBody(body: any): any {
    const data = { ...body };
    const jsonFields = ["coordinates"];

    jsonFields.forEach((field) => {
      if (typeof data[field] === "string") {
        try {
          data[field] = JSON.parse(data[field]);
        } catch (e) {}
      }
    });

    return data;
  }

  private static ensureImageForValidator(
    data: any,
    file?: Express.Multer.File,
  ): any {
    return data;
  }

  static async createProgram(req: Request, res: Response) {
    try {
      let data = ProgramController.parseMultipartBody(req.body);

      const parseResult = programBaseSchema.safeParse(data);

      if (!parseResult.success) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: parseResult.error.format(),
        });
      }

      const program = await ProgramService.create(parseResult.data, req.file);

      return res.status(201).json({
        success: true,
        message: "Program created successfully",
        data: program,
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message || "Server error",
      });
    }
  }

  static async getAllPrograms(req: Request, res: Response) {
    try {
      const query = {
        category: (req.query.category as string) || undefined,
        search: (req.query.search as string) || undefined,
      };

      const programs = await ProgramService.getAll(query);

      return res.status(200).json({
        success: true,
        data: programs,
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message || "Server error",
      });
    }
  }

  static async getProgramById(req: Request, res: Response) {
    try {
      const id = routeParam(req.params.id);
      const program = await ProgramService.getById(id);

      if (!program) {
        return res.status(404).json({
          success: false,
          message: "Program not found",
        });
      }

      return res.status(200).json({
        success: true,
        data: program,
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message || "Server error",
      });
    }
  }

  static async updateProgram(req: Request, res: Response) {
    try {
      let data = ProgramController.parseMultipartBody(req.body);

      const parseResult = programBaseSchema.partial().safeParse(data);

      if (!parseResult.success) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: parseResult.error.format(),
        });
      }

      const id = routeParam(req.params.id);

      const updatedProgram = await ProgramService.update(
        id,
        parseResult.data,
        req.file,
      );

      if (!updatedProgram) {
        return res.status(404).json({
          success: false,
          message: "Program not found",
        });
      }

      return res.status(200).json({
        success: true,
        message: "Program updated successfully",
        data: updatedProgram,
      });
    } catch (error: any) {
      console.error(error);
      return res.status(500).json({
        success: false,
        message: error.message || "Server error",
      });
    }
  }

  static async deleteProgram(req: Request, res: Response) {
    try {
      const id = routeParam(req.params.id);
      const success = await ProgramService.delete(id);

      if (!success) {
        return res.status(404).json({
          success: false,
          message: "Program not found",
        });
      }

      return res.status(200).json({
        success: true,
        message: "Program deleted successfully",
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message || "Server error",
      });
    }
  }
}

export default ProgramController;
