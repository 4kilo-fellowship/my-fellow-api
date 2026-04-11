import TeamModel from "../models/team.model.js";
import { Team } from "../validators/team.validator.js";
import { uploadImageToCloudinary } from "./cloudinary.service.js";

export class TeamService {
  static async create(
    data: Team,
    files?: { [fieldname: string]: Express.Multer.File[] },
  ): Promise<Team> {
    let imageUrl: string = data.imageUrl;
    let leaderImageUrl: string =
      data.leader?.imageUrl || "https://placeholder.com/leader.jpg";

    const imageFile = files?.["image"]?.[0];
    const leaderImageFile = files?.["leaderImage"]?.[0];

    if (imageFile && imageFile.buffer) {
      try {
        const uploadResult = await uploadImageToCloudinary(imageFile.buffer, {
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

    if (leaderImageFile && leaderImageFile.buffer) {
      try {
        const uploadResult = await uploadImageToCloudinary(
          leaderImageFile.buffer,
          {
            folder: "teams/leaders",
            transformation: {
              quality: "auto",
              fetch_format: "auto",
            },
          },
        );
        leaderImageUrl = uploadResult.secure_url;
      } catch (error: any) {
        throw new Error(
          `Failed to upload leader image: ${error.message || "Unknown upload error"}`,
        );
      }
    }

    const team = await TeamModel.create({
      ...data,
      imageUrl,
      leader: {
        ...data.leader,
        imageUrl: leaderImageUrl,
      },
    });

    return team as unknown as Team;
  }

  static async getAll(query: {
    category?: string;
    search?: string;
  }): Promise<Team[]> {
    const filter: Record<string, any> = { isDeleted: false };

    if (query.category) {
      filter.category = query.category;
    }
    if (query.search) {
      filter.name = { $regex: query.search, $options: "i" };
    }

    const teams = await TeamModel.find(filter).sort({ createdAt: -1 }).lean();
    return teams as unknown as Team[];
  }

  static async getById(id: string): Promise<Team | null> {
    const team = await TeamModel.findOne({ _id: id, isDeleted: false }).lean();
    return team as unknown as Team | null;
  }

  static async update(
    id: string,
    data: Partial<Team>,
    files?: { [fieldname: string]: Express.Multer.File[] },
  ): Promise<Team | null> {
    const existingTeam = await TeamModel.findOne({ _id: id, isDeleted: false });
    if (!existingTeam) {
      return null;
    }

    let imageUrl: string | undefined = data.imageUrl;
    let leaderImageUrl: string | undefined = data.leader?.imageUrl;

    const imageFile = files?.["image"]?.[0];
    const leaderImageFile = files?.["leaderImage"]?.[0];

    if (imageFile && imageFile.buffer) {
      try {
        const uploadResult = await uploadImageToCloudinary(imageFile.buffer, {
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

    if (leaderImageFile && leaderImageFile.buffer) {
      try {
        const uploadResult = await uploadImageToCloudinary(
          leaderImageFile.buffer,
          {
            folder: "teams/leaders",
            transformation: {
              quality: "auto",
              fetch_format: "auto",
            },
          },
        );
        leaderImageUrl = uploadResult.secure_url;
      } catch (error: any) {
        throw new Error(
          `Failed to upload leader image: ${error.message || "Unknown upload error"}`,
        );
      }
    }

    const updatePayload: any = { ...data };

    if (imageUrl) {
      updatePayload.imageUrl = imageUrl;
    }

    if (leaderImageUrl) {
      if (!updatePayload.leader) updatePayload.leader = {};
      updatePayload.leader.imageUrl = leaderImageUrl;
    }

    const updatedTeam = await TeamModel.findByIdAndUpdate(
      id,
      { $set: updatePayload },
      { new: true, runValidators: true },
    ).lean();

    return updatedTeam as unknown as Team | null;
  }

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
