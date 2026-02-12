import { Request, Response } from "express";
import { ProgramService } from "../services/program.service.js";
import { programBaseSchema } from "../validators/program.validator.js";

export class ProgramController {
  private static parseMultipartBody(body: any): any {
    const data = { ...body };
    const jsonFields = ["coordinates"];

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

  private static ensureImageForValidator(
    data: any,
    file?: Express.Multer.File,
  ): any {
    // If a file is uploaded but no image URL is provided in body,
    // we can temporarily unset it or allow validator to pass if optional.
    // However, the validator expects a string URL or empty string if optional.
    // We will let the service handle the actual upload and URL generation.
    // For validation purposes, if a file is present, we can assume image is valid or optional.
    // But since `image` is optional in schema, we don't strictly need to inject a placeholder unless required.
    // In TeamController it injected a placeholder. I will follow that pattern if needed,
    // but here `image` is optional in my validator.
    // existing TeamController logic:
    // if (file && (!data.imageUrl || data.imageUrl === "")) { data.imageUrl = "https://placeholder.com/image.jpg"; }

    // For Program, `image` is optional in Zod schema, so we might not need this hack if we trust the service to handle it.
    // But to be consistent with TeamController's pattern (which might be due to some specific Zod requirement or frontend behavior), I'll check.
    // My Zod schema: image: z.union([z.string().url(), z.literal("")]).optional()
    // So if it's missing, it's fine.

    return data;
  }

  static async createProgram(req: Request, res: Response) {
    try {
      let data = ProgramController.parseMultipartBody(req.body);
      // data = ProgramController.ensureImageForValidator(data, req.file);

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
      const { id } = req.params;
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

      const { id } = req.params;

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
      const { id } = req.params;
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
