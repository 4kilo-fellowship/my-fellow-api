import { SupportTicket } from "../models/support.model.js";
import { uploadImageToCloudinary } from "./cloudinary.service.js";

export class SupportService {
  static async createTicket(
    userId: string,
    message?: string,
    file?: Express.Multer.File,
  ) {
    let imageUrl: string | undefined;

    if (file && file.buffer) {
      try {
        const uploadResult = await uploadImageToCloudinary(file.buffer, {
          folder: "support-tickets",
        });
        imageUrl = uploadResult.secure_url;
      } catch (error: any) {
        throw new Error(
          `Failed to upload image: ${error.message || "Image upload error"}`,
        );
      }
    }

    const ticket = new SupportTicket({
      userId,
      message,
      imageUrl,
    });

    await ticket.save();
    return ticket;
  }
}
