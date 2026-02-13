import LocationModel, { ILocation } from "../models/location.model.js";
import { Location } from "../validators/location.validator.js";
import { uploadImageToCloudinary } from "./cloudinary.service.js";

export class LocationService {
  static async create(
    data: Location,
    file?: Express.Multer.File,
  ): Promise<ILocation> {
    let image: string = data.image || "";
    if (file && file.buffer) {
      try {
        const uploadResult = await uploadImageToCloudinary(file.buffer, {
          folder: "locations",
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

    const location = await LocationModel.create({
      ...data,
      image,
    });

    return location;
  }

  static async getAll(query: { search?: string }): Promise<ILocation[]> {
    const filter: Record<string, any> = { isDeleted: false };

    if (query.search) {
      filter.name = { $regex: query.search, $options: "i" };
    }

    const locations = await LocationModel.find(filter)
      .sort({ createdAt: -1 })
      .lean();
    return locations as unknown as ILocation[];
  }

  static async getById(id: string): Promise<ILocation | null> {
    const location = await LocationModel.findOne({
      _id: id,
      isDeleted: false,
    }).lean();
    return location as unknown as ILocation | null;
  }

  static async update(
    id: string,
    data: Partial<Location>,
    file?: Express.Multer.File,
  ): Promise<ILocation | null> {
    const existingLocation = await LocationModel.findOne({
      _id: id,
      isDeleted: false,
    });
    if (!existingLocation) {
      return null;
    }

    let image: string | undefined = data.image;

    if (file && file.buffer) {
      try {
        const uploadResult = await uploadImageToCloudinary(file.buffer, {
          folder: "locations",
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

    const updatePayload: Partial<ILocation> = { ...data };

    if (image) {
      updatePayload.image = image;
    }

    const updatedLocation = await LocationModel.findByIdAndUpdate(
      id,
      { $set: updatePayload },
      { new: true, runValidators: true },
    ).lean();

    return updatedLocation as unknown as ILocation | null;
  }

  static async delete(id: string): Promise<boolean> {
    const location = await LocationModel.findOne({ _id: id, isDeleted: false });
    if (!location) {
      return false;
    }

    location.isDeleted = true;
    location.deletedAt = new Date();
    await location.save();
    return true;
  }
}
