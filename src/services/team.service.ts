import TeamModel, { ITeam } from "../models/team.model.js";
import {
  CreateTeamInput,
  UpdateTeamInput,
} from "../validators/team.validator.js";
import { uploadImageToCloudinary } from "./cloudinary.service.js";

export class TeamService {
  static async create(data: CreateTeamInput, file?: Express.Multer.File) {
    let imageUrl: string | undefined = data.imageUrl;

    if (file && file.buffer) {
      try {
        const uploadResult = await uploadImageToCloudinary(file.buffer, {
          folder: "teams",
          transformation: {
            quality: "auto",
            fetch_format: "auto",
          },
        });
        imageUrl = uploadResult.secure_url;
      } catch (error: any) {
        throw new Error(
          `Failed to upload image: ${error.message || "Image upload error"}`,
        );
      }
    }

    const team = await TeamModel.create({
      ...data,
      imageUrl,
    });

    return team;
  }

  static async getAll(query: any = {}) {
    // Basic filtering, could be expanded
    const filter: any = { isDeleted: false };
    if (query.category) {
      filter.category = query.category;
    }
    // Search by name if needed
    if (query.search) {
      filter.name = { $regex: query.search, $options: "i" };
    }

    const teams = await TeamModel.find(filter).sort({ createdAt: -1 });
    return teams;
  }

  static async getById(id: string) {
    const team = await TeamModel.findOne({ _id: id, isDeleted: false });
    return team;
  }

  static async update(
    id: string,
    data: UpdateTeamInput,
    file?: Express.Multer.File,
  ) {
    const existingTeam = await TeamModel.findOne({ _id: id, isDeleted: false });
    if (!existingTeam) {
      return null;
    }

    let imageUrl: string | undefined = data.imageUrl;

    if (file && file.buffer) {
      try {
        const uploadResult = await uploadImageToCloudinary(file.buffer, {
          folder: "teams",
          transformation: {
            quality: "auto",
            fetch_format: "auto",
          },
        });
        imageUrl = uploadResult.secure_url;
      } catch (error: any) {
        throw new Error(
          `Failed to upload image: ${error.message || "Image upload error"}`,
        );
      }
    }

    // Merge data, but careful with nested partial updates if any
    // Mongoose handles top-level merge fine.
    // For nested objects like `leader` or `coordinates`, if provided, they replace the whole object usually unless using dot notation.
    // Here we replace the whole nested object if it's in `data`.

    // Construct update object
    const updateData: any = { ...data };
    if (imageUrl) {
      updateData.imageUrl = imageUrl;
    }

    const updatedTeam = await TeamModel.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true },
    );

    return updatedTeam;
  }

  static async delete(id: string) {
    const team = await TeamModel.findOne({ _id: id, isDeleted: false });
    if (!team) {
      return null;
    }

    team.isDeleted = true;
    team.deletedAt = new Date();
    await team.save();
    return team;
  }
}
