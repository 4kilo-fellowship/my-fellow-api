import LeaderModel, { ILeader } from "../models/leader.model.js";
import { Leader } from "../validators/leader.validator.js";
import { uploadImageToCloudinary } from "./cloudinary.service.js";

export class LeaderService {
  static async create(
    data: Leader,
    file?: Express.Multer.File,
  ): Promise<ILeader> {
    let image: string = data.image || "";
    if (file && file.buffer) {
      try {
        const uploadResult = await uploadImageToCloudinary(file.buffer, {
          folder: "leaders",
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

    const leader = await LeaderModel.create({
      ...data,
      image,
    });

    return leader;
  }

  static async getAll(query: {
    type?: string;
    search?: string;
  }): Promise<ILeader[]> {
    const filter: Record<string, any> = { isDeleted: false };

    if (query.type) {
      filter.type = query.type;
    }
    if (query.search) {
      filter.name = { $regex: query.search, $options: "i" };
    }

    const leaders = await LeaderModel.find(filter)
      .sort({ createdAt: -1 })
      .lean();
    return leaders as unknown as ILeader[];
  }

  static async getById(id: string): Promise<ILeader | null> {
    const leader = await LeaderModel.findOne({
      _id: id,
      isDeleted: false,
    }).lean();
    return leader as unknown as ILeader | null;
  }

  static async update(
    id: string,
    data: Partial<Leader>,
    file?: Express.Multer.File,
  ): Promise<ILeader | null> {
    const existingLeader = await LeaderModel.findOne({
      _id: id,
      isDeleted: false,
    });
    if (!existingLeader) {
      return null;
    }

    let image: string | undefined = data.image;

    if (file && file.buffer) {
      try {
        const uploadResult = await uploadImageToCloudinary(file.buffer, {
          folder: "leaders",
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

    const updatePayload: Partial<ILeader> = { ...data };

    if (image) {
      updatePayload.image = image;
    }

    const updatedLeader = await LeaderModel.findByIdAndUpdate(
      id,
      { $set: updatePayload },
      { new: true, runValidators: true },
    ).lean();

    return updatedLeader as unknown as ILeader | null;
  }

  static async delete(id: string): Promise<boolean> {
    const leader = await LeaderModel.findOne({ _id: id, isDeleted: false });
    if (!leader) {
      return false;
    }

    leader.isDeleted = true;
    leader.deletedAt = new Date();
    await leader.save();
    return true;
  }
}
