import { Request, Response } from "express";
import { AuthRequest } from "../middleware/auth.middleware.js";
import EventModel from "../models/event.model.js";
import RegistrationModel from "../models/registration.model.js";
import { uploadImageToCloudinary } from "../services/cloudinary.service.js";
import { routeParam } from "../utils/routeParam.js";
import { AIService } from "../services/ai/ai.service.js";
import {
  createEventSchema,
  updateEventSchema,
} from "../validators/event.validator.js";
import { createRegistrationSchema } from "../validators/registration.validator.js";

export class EventsController {
  static async createEvent(req: Request, res: Response) {
    try {
      const parseResult = createEventSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: parseResult.error.format(),
        });
      }

      const data = parseResult.data;

      let imageUrl: string | undefined = undefined;
      if (req.file) {
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
        registrationLimit: data.registrationLimit ?? undefined,
        scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : undefined,
      });

      return res.status(201).json({ success: true, data: created });
    } catch (error: any) {
      return res
        .status(500)
        .json({ success: false, message: error.message || "Server error" });
    }
  }

  static async getAllEvents(req: Request, res: Response) {
    try {
      const sort = (req.query.sort as string) || "asc";
      const sortOrder = sort === "desc" ? -1 : 1;
      const isAdmin = (req as any).user?.role === "admin";

      const query: any = { isDeleted: { $ne: true } };

      if (!isAdmin) {
        query.$or = [
          { scheduledAt: { $exists: false } },
          { scheduledAt: { $eq: null } },
          { scheduledAt: { $lte: new Date() } },
        ];
      }

      const events = await EventModel.find(query)
        .sort({ startDate: sortOrder })
        .lean();

      return res.status(200).json({ success: true, data: events });
    } catch (error: any) {
      return res
        .status(500)
        .json({ success: false, message: error.message || "Server error" });
    }
  }

  static async getEventById(req: Request, res: Response) {
    try {
      const id = routeParam(req.params.id);
      const event = await EventModel.findById(id).lean();
      if (!event) {
        return res
          .status(404)
          .json({ success: false, message: "Event not found" });
      }
      return res.status(200).json({ success: true, data: event });
    } catch (error: any) {
      return res
        .status(500)
        .json({ success: false, message: error.message || "Server error" });
    }
  }

  static async updateEvent(req: Request, res: Response) {
    try {
      const id = routeParam(req.params.id);
      const parseResult = updateEventSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: parseResult.error.format(),
        });
      }

      const data = parseResult.data as any;

      if (req.file) {
        const result = await uploadImageToCloudinary(req.file.buffer, {
          folder: "events",
        });
        data.imageUrl = result.secure_url;
      }

      if (data.startDate) data.startDate = new Date(data.startDate);
      if (data.endDate) data.endDate = new Date(data.endDate);
      if (data.scheduledAt) {
        data.scheduledAt = new Date(data.scheduledAt);
      } else if (data.scheduledAt === null) {
        data.scheduledAt = undefined;
      }

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
      return res
        .status(500)
        .json({ success: false, message: error.message || "Server error" });
    }
  }

  static async deleteEvent(req: Request, res: Response) {
    try {
      const id = routeParam(req.params.id);
      const removed = await EventModel.findByIdAndUpdate(
        id,
        { isDeleted: true },
        { new: true },
      ).lean();
      if (!removed) {
        return res
          .status(404)
          .json({ success: false, message: "Event not found" });
      }

      return res.status(200).json({ success: true, message: "Event deleted" });
    } catch (error: any) {
      return res
        .status(500)
        .json({ success: false, message: error.message || "Server error" });
    }
  }

  static async registerForEvent(req: AuthRequest, res: Response) {
    try {
      const parseResult = createRegistrationSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: parseResult.error.format(),
        });
      }

      const { eventId } = parseResult.data;
      const userId = req.user!.sub;

      const event = await EventModel.findById(eventId);
      if (!event) {
        return res.status(404).json({
          success: false,
          message: "Event not found",
        });
      }

      if (
        event.registrationLimit !== null &&
        event.registrationLimit !== undefined &&
        event.registrationsCount >= event.registrationLimit
      ) {
        return res.status(400).json({
          success: false,
          message: "Event is full",
        });
      }

      const existingRegistration = await RegistrationModel.findOne({
        userId,
        eventId,
      });

      if (existingRegistration) {
        return res.status(400).json({
          success: false,
          message: "You are already registered for this event",
        });
      }

      const registration = await RegistrationModel.create({ userId, eventId });

      await EventModel.findByIdAndUpdate(eventId, {
        $inc: { registrationsCount: 1 },
      });

      return res.status(201).json({
        success: true,
        message: "Successfully registered for the event",
        data: registration,
      });
    } catch (error: any) {
      return res
        .status(500)
        .json({ success: false, message: error.message || "Server error" });
    }
  }

  static async unregisterFromEvent(req: AuthRequest, res: Response) {
    try {
      const parseResult = createRegistrationSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: parseResult.error.format(),
        });
      }

      const { eventId } = parseResult.data;
      const userId = req.user!.sub;

      const removed = await RegistrationModel.findOneAndDelete({
        userId,
        eventId,
      }).lean();

      if (!removed) {
        return res.status(404).json({
          success: false,
          message: "Registration not found",
        });
      }

      await EventModel.findByIdAndUpdate(eventId, {
        $inc: { registrationsCount: -1 },
      });

      return res.status(200).json({
        success: true,
        message: "Successfully unregistered from the event",
      });
    } catch (error: any) {
      return res
        .status(500)
        .json({ success: false, message: error.message || "Server error" });
    }
  }

  static async getAllRegistrations(req: Request, res: Response) {
    try {
      const registrations = await RegistrationModel.find()
        .populate("userId", "-password")
        .populate("eventId")
        .sort({ createdAt: -1 })
        .lean();
      return res.status(200).json({ success: true, data: registrations });
    } catch (error: any) {
      return res
        .status(500)
        .json({ success: false, message: error.message || "Server error" });
    }
  }

  static async getRegistrationsByEvent(req: Request, res: Response) {
    try {
      const eventId = routeParam(req.params.eventId);
      const registrations = await RegistrationModel.find({ eventId })
        .populate("userId", "-password")
        .populate("eventId")
        .sort({ createdAt: -1 })
        .lean();
      return res.status(200).json({ success: true, data: registrations });
    } catch (error: any) {
      return res
        .status(500)
        .json({ success: false, message: error.message || "Server error" });
    }
  }

  static async checkRegistrationStatus(req: AuthRequest, res: Response) {
    try {
      const eventId = routeParam(req.params.eventId);
      const userId = req.user!.sub;

      const registration = await RegistrationModel.findOne({
        userId,
        eventId,
      }).lean();

      return res.status(200).json({
        success: true,
        isRegistered: !!registration,
        data: registration || null,
      });
    } catch (error: any) {
      return res
        .status(500)
        .json({ success: false, message: error.message || "Server error" });
    }
  }

  static async generatePoster(req: AuthRequest, res: Response) {
    try {
      const admin = req.user;
      if (!admin || admin.role !== "admin") {
        return res.status(403).json({
          success: false,
          message: "Only admins can generate posters",
        });
      }

      const { prompt, colors, eventDetails, style } = req.body;

      if (!prompt) {
        return res.status(400).json({
          success: false,
          message: "Prompt is required for generation",
        });
      }

      let referenceImages: { mimeType: string; data: string }[] = [];
      const files = req.files as Express.Multer.File[];

      if (files && files.length > 0) {
        referenceImages = files.slice(0, 3).map((file) => ({
          mimeType: file.mimetype,
          data: file.buffer.toString("base64"),
        }));
      }

      let parsedColors;
      try {
        parsedColors = colors ? JSON.parse(colors) : undefined;
      } catch (e) {
        parsedColors = undefined;
      }

      let parsedEventDetails;
      try {
        parsedEventDetails = eventDetails
          ? JSON.parse(eventDetails)
          : undefined;
      } catch (e) {
        parsedEventDetails = undefined;
      }

      const aiService = new AIService();

      const imageUrl = await aiService.generatePoster({
        prompt,
        referenceImages,
        colors: parsedColors,
        eventDetails: parsedEventDetails,
        style,
      });

      return res.status(200).json({
        success: true,
        message: "Poster generated successfully",
        imageUrl,
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to generate poster",
      });
    }
  }
}

export default EventsController;
