import { Request, Response } from "express";
import EventModel from "../models/event.model.js";
import {
  createEventSchema,
  updateEventSchema,
} from "../validators/event.validator.js";
import { uploadImageToCloudinary } from "../services/cloudinary.service.js";

export class EventsController {
  /**
   * POST /api/events
   * Accepts multipart/form-data with optional `image` file or `imageUrl` in body
   */
  static async createEvent(req: Request, res: Response) {
    try {
      // Validate body fields (they will be strings in multipart)
      const parseResult = createEventSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: parseResult.error.format(),
        });
      }

      const data = parseResult.data;

      // Handle image: file or imageUrl
      let imageUrl: string | undefined = undefined;
      if (req.file) {
        // upload buffer to Cloudinary (folder 'events')
        const result = await uploadImageToCloudinary(req.file.buffer, {
          folder: "events",
        });
        imageUrl = result.secure_url;
      } else if (data.imageUrl) {
        imageUrl = data.imageUrl;
      }

      if (!imageUrl) {
        return res.status(400).json({
          success: false,
          message: "An image is required: upload a file or provide imageUrl",
        });
      }

      const created = await EventModel.create({
        title: data.title,
        shortDescription: data.shortDescription,
        fullDescription: data.fullDescription,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        buttonText: data.buttonText,
        imageUrl,
      });

      return res.status(201).json({ success: true, data: created });
    } catch (error: any) {
      console.error("Create event error:", error);
      return res
        .status(500)
        .json({ success: false, message: error.message || "Server error" });
    }
  }

  /**
   * GET /api/events
   * Optional query: sort=asc|desc to sort by startDate
   */
  static async getAllEvents(req: Request, res: Response) {
    try {
      const sort = (req.query.sort as string) || "asc";
      const sortOrder = sort === "desc" ? -1 : 1;

      const events = await EventModel.find()
        .sort({ startDate: sortOrder })
        .lean();

      return res.status(200).json({ success: true, data: events });
    } catch (error: any) {
      console.error("Get events error:", error);
      return res
        .status(500)
        .json({ success: false, message: error.message || "Server error" });
    }
  }

  /**
   * GET /api/events/:id
   */
  static async getEventById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const event = await EventModel.findById(id).lean();
      if (!event) {
        return res
          .status(404)
          .json({ success: false, message: "Event not found" });
      }
      return res.status(200).json({ success: true, data: event });
    } catch (error: any) {
      console.error("Get event by id error:", error);
      return res
        .status(500)
        .json({ success: false, message: error.message || "Server error" });
    }
  }

  /**
   * PUT /api/events/:id (optional)
   * Accepts multipart/form-data with optional `image` file to replace imageUrl
   */
  static async updateEvent(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const parseResult = updateEventSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res
          .status(400)
          .json({
            success: false,
            message: "Validation failed",
            errors: parseResult.error.format(),
          });
      }

      const data = parseResult.data as any;

      // If file provided, upload and replace imageUrl
      if (req.file) {
        const result = await uploadImageToCloudinary(req.file.buffer, {
          folder: "events",
        });
        data.imageUrl = result.secure_url;
      }

      // Convert dates if present
      if (data.startDate) data.startDate = new Date(data.startDate);
      if (data.endDate) data.endDate = new Date(data.endDate);

      const updated = await EventModel.findByIdAndUpdate(id, data, {
        new: true,
      }).lean();
      if (!updated) {
        return res
          .status(404)
          .json({ success: false, message: "Event not found" });
      }

      return res.status(200).json({ success: true, data: updated });
    } catch (error: any) {
      console.error("Update event error:", error);
      return res
        .status(500)
        .json({ success: false, message: error.message || "Server error" });
    }
  }

  /**
   * DELETE /api/events/:id (optional)
   */
  static async deleteEvent(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const removed = await EventModel.findByIdAndDelete(id).lean();
      if (!removed) {
        return res
          .status(404)
          .json({ success: false, message: "Event not found" });
      }

      // Optionally, you could delete from Cloudinary by extracting public id
      // const publicId = extractPublicIdFromUrl(removed.imageUrl);
      // if (publicId) await deleteImageFromCloudinary(publicId);

      return res.status(200).json({ success: true, message: "Event deleted" });
    } catch (error: any) {
      console.error("Delete event error:", error);
      return res
        .status(500)
        .json({ success: false, message: error.message || "Server error" });
    }
  }
}

export default EventsController;
