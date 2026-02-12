import ProgramModel, { IProgram } from "../models/program.model.js";
import { Program } from "../validators/program.validator.js";
import { uploadImageToCloudinary } from "./cloudinary.service.js";

export class ProgramService {
  static async create(
    data: Program,
    file?: Express.Multer.File,
  ): Promise<IProgram> {
    let image: string = data.image || "";
    if (file && file.buffer) {
      try {
        const uploadResult = await uploadImageToCloudinary(file.buffer, {
          folder: "programs",
          transformation: {
            quality: "auto",
            fetch_format: "auto",
          },
        });
        image = uploadResult.secure_url;
      } catch (error: any) {
        throw new Error(
          `Failed to upload image: ${error.message || "Unknown upload error"}`,
        );
      }
    }

    const program = await ProgramModel.create({
      ...data,
      image,
    });

    return program;
  }

  static async getAll(query: {
    category?: string;
    search?: string;
  }): Promise<IProgram[]> {
    const filter: Record<string, any> = { isDeleted: false };

    if (query.category) {
      filter.category = query.category;
    }
    if (query.search) {
      filter.title = { $regex: query.search, $options: "i" };
    }

    const programs = await ProgramModel.find(filter)
      .sort({ createdAt: -1 })
      .lean();
    return programs as unknown as IProgram[];
  }

  static async getById(id: string): Promise<IProgram | null> {
    const program = await ProgramModel.findOne({
      _id: id,
      isDeleted: false,
    }).lean();
    return program as unknown as IProgram | null;
  }

  static async update(
    id: string,
    data: Partial<Program>,
    file?: Express.Multer.File,
  ): Promise<IProgram | null> {
    const existingProgram = await ProgramModel.findOne({
      _id: id,
      isDeleted: false,
    });
    if (!existingProgram) {
      return null;
    }

    let image: string | undefined = data.image;

    if (file && file.buffer) {
      try {
        const uploadResult = await uploadImageToCloudinary(file.buffer, {
          folder: "programs",
          transformation: {
            quality: "auto",
            fetch_format: "auto",
          },
        });
        image = uploadResult.secure_url;
      } catch (error: any) {
        throw new Error(
          `Failed to upload image: ${error.message || "Unknown upload error"}`,
        );
      }
    }

    const updatePayload: Partial<IProgram> = { ...data };

    if (image) {
      updatePayload.image = image;
    }

    const updatedProgram = await ProgramModel.findByIdAndUpdate(
      id,
      { $set: updatePayload },
      { new: true, runValidators: true },
    ).lean();

    return updatedProgram as unknown as IProgram | null;
  }

  static async delete(id: string): Promise<boolean> {
    const program = await ProgramModel.findOne({ _id: id, isDeleted: false });
    if (!program) {
      return false;
    }

    program.isDeleted = true;
    program.deletedAt = new Date();
    await program.save();
    return true;
  }
}
