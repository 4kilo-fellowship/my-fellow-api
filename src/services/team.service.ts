import TeamModel from "../models/team.model.js";
import { Team } from "../validators/team.validator.js";
import { uploadImageToCloudinary } from "./cloudinary.service.js";

export class TeamService {
  /**
   * Create a new team.
   * Handles optional image file upload.
   */
  static async create(data: Team, file?: Express.Multer.File): Promise<Team> {
    let imageUrl: string = data.imageUrl;

    // If a file is uploaded, it takes precedence over the body's imageUrl
    // (which might be a placeholder or empty)
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
          `Failed to upload image: ${error.message || "Unknown upload error"}`,
        );
      }
    }

    const team = await TeamModel.create({
      ...data,
      imageUrl,
    });

    // We cast to unknown then Team (or essentially rely on Mongoose returning the doc)
    // returning the raw doc is usually fine, or we can explicit return team.toObject()
    return team as unknown as Team;
  }

  /**
   * Get all teams, with optional filtering.
   * Excludes soft-deleted teams.
   */
  static async getAll(query: {
    category?: string;
    search?: string;
  }): Promise<Team[]> {
    const filter: Record<string, any> = { isDeleted: false };

    if (query.category) {
      filter.category = query.category;
    }
    if (query.search) {
      // Case-insensitive search on name
      filter.name = { $regex: query.search, $options: "i" };
    }

    const teams = await TeamModel.find(filter).sort({ createdAt: -1 }).lean();
    return teams as unknown as Team[];
  }

  /**
   * Get a single team by ID.
   * Excludes soft-deleted teams.
   */
  static async getById(id: string): Promise<Team | null> {
    const team = await TeamModel.findOne({ _id: id, isDeleted: false }).lean();
    return team as unknown as Team | null;
  }

  /**
   * Update a team.
   * Handles optional image file upload.
   * Merges partial data.
   */
  static async update(
    id: string,
    data: Partial<Team>,
    file?: Express.Multer.File,
  ): Promise<Team | null> {
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
          `Failed to upload image: ${error.message || "Unknown upload error"}`,
        );
      }
    }

    // Prepare update object. Explicitly handling undefined to avoid overwriting with nulls if not intended
    // though Mongoose generic update handles this well.
    // We construct a specific update object to be type-safe.
    const updatePayload: Partial<Team> = { ...data };

    if (imageUrl) {
      updatePayload.imageUrl = imageUrl;
    }

    // Using { new: true } returns the updated document
    const updatedTeam = await TeamModel.findByIdAndUpdate(
      id,
      { $set: updatePayload },
      { new: true, runValidators: true },
    ).lean();

    return updatedTeam as unknown as Team | null;
  }

  /**
   * Soft delete a team.
   */
  static async delete(id: string): Promise<boolean> {
    const team = await TeamModel.findOne({ _id: id, isDeleted: false });
    if (!team) {
      return false;
    }

    team.isDeleted = true;
    team.deletedAt = new Date();
    await team.save();
    return true;
  }
}
