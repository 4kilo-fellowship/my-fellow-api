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
import { normalizeRole } from "../rbac/permissions.js";
import { roleHasPermission } from "../rbac/permissions.js";

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

      const registrationLimit =
        data.registrationLimit ?? data.maxRegistrations ?? undefined;
      const isOutdated = new Date(data.endDate) < new Date();
      const isPublished = isOutdated
        ? false
        : data.isPublished !== undefined
        ? Boolean(data.isPublished)
        : true;
      const autoUnpublished = isOutdated;

      const created = await EventModel.create({
        title: data.title,
        shortDescription: data.shortDescription,
        fullDescription: data.fullDescription,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        buttonText: data.buttonText,
        imageUrl,
        isPublished,
        autoUnpublished,
        registrationLimit,
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
      const scope = req.query.scope as string | undefined;
      const status = req.query.status as string | undefined;
      const includeExpired = req.query.includeExpired === "true";
      const viewer = (req as AuthRequest).user;
      const canViewUnpublished =
        viewer &&
        roleHasPermission(
          viewer?.role,
          "events.view",
          viewer?.permissions,
        ) &&
        normalizeRole(viewer?.role) !== "member";

      const now = new Date();

      // Auto-unpublish any events whose endDate has passed
      await EventModel.updateMany(
        {
          isDeleted: { $ne: true },
          isPublished: { $ne: false },
          endDate: { $lt: now },
        },
        {
          $set: {
            isPublished: false,
            autoUnpublished: true,
          },
        },
      ).catch(() => {});

      const isAdminManagement =
        Boolean(canViewUnpublished) &&
        (scope === "admin" || status !== undefined || includeExpired);

      const query: any = { isDeleted: { $ne: true } };

      if (!isAdminManagement) {
        // Mobile feed and standard consumer view: STRICTLY active, published, non-outdated events
        query.isPublished = { $ne: false };
        query.endDate = { $gte: now };
        query.$or = [
          { scheduledAt: { $exists: false } },
          { scheduledAt: { $eq: null } },
          { scheduledAt: { $lte: now } },
        ];
      } else {
        if (status === "published") {
          query.isPublished = { $ne: false };
          query.endDate = { $gte: now };
        } else if (status === "unpublished") {
          query.isPublished = false;
        } else if (status === "expired") {
          query.endDate = { $lt: now };
        }
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
      if (!event || event.isDeleted) {
        return res
          .status(404)
          .json({ success: false, message: "Event not found" });
      }
      const viewer = (req as AuthRequest).user;
      const isPrivileged =
        viewer &&
        roleHasPermission(
          viewer?.role,
          "events.view",
          viewer?.permissions,
        ) &&
        normalizeRole(viewer?.role) !== "member";

      const now = new Date();
      if (event.isPublished !== false && new Date(event.endDate) < now) {
        await EventModel.findByIdAndUpdate(id, {
          isPublished: false,
          autoUnpublished: true,
        }).catch(() => {});
        event.isPublished = false;
        event.autoUnpublished = true;
      }

      if (!isPrivileged) {
        if (event.isPublished === false || new Date(event.endDate) < now) {
          return res.status(404).json({
            success: false,
            message: "This event has ended or is currently unpublished",
          });
        }
        if (
          event.scheduledAt &&
          event.scheduledAt > now
        ) {
          return res
            .status(404)
            .json({ success: false, message: "Event not found" });
        }
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

      if (data.registrationLimit === undefined && data.maxRegistrations !== undefined) {
        data.registrationLimit = data.maxRegistrations;
      }
      delete data.maxRegistrations;

      if (data.isPublished !== undefined) {
        data.isPublished = Boolean(data.isPublished);
        if (data.isPublished) {
          data.autoUnpublished = false;
        }
      }

      if (data.startDate) data.startDate = new Date(data.startDate);
      if (data.endDate) {
        data.endDate = new Date(data.endDate);
        if (data.endDate < new Date()) {
          data.isPublished = false;
          data.autoUnpublished = true;
        }
      }
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

  static async togglePublish(req: Request, res: Response) {
    try {
      const id = routeParam(req.params.id);
      const event = await EventModel.findById(id);
      if (!event || event.isDeleted) {
        return res
          .status(404)
          .json({ success: false, message: "Event not found" });
      }

      const nextState =
        req.body.isPublished !== undefined
          ? Boolean(req.body.isPublished)
          : !event.isPublished;

      event.isPublished = nextState;
      if (nextState) {
        event.autoUnpublished = false;
      }
      await event.save();

      return res.status(200).json({
        success: true,
        message: nextState ? "Event published" : "Event unpublished",
        data: event,
      });
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
      if (!event || event.isDeleted) {
        return res.status(404).json({
          success: false,
          message: "Event not found",
        });
      }

      const now = new Date();

      if (new Date(event.endDate) < now) {
        if (event.isPublished) {
          await EventModel.findByIdAndUpdate(eventId, {
            isPublished: false,
            autoUnpublished: true,
          }).catch(() => {});
        }
        return res.status(400).json({
          success: false,
          message: "Registration is closed because this event has already ended",
        });
      }

      if (event.isPublished === false) {
        return res.status(400).json({
          success: false,
          message: "Registration for this event is closed or event is unpublished",
        });
      }

      if (
        event.registrationLimit !== null &&
        event.registrationLimit !== undefined &&
        event.registrationsCount >= event.registrationLimit
      ) {
        if (event.isPublished) {
          await EventModel.findByIdAndUpdate(eventId, {
            isPublished: false,
            autoUnpublished: true,
          });
        }
        return res.status(400).json({
          success: false,
          message: "Event registration is full",
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

      const updatedEvent = await EventModel.findByIdAndUpdate(
        eventId,
        { $inc: { registrationsCount: 1 } },
        { new: true },
      );

      // Auto-unpublish if limit reached!
      if (
        updatedEvent &&
        updatedEvent.registrationLimit !== null &&
        updatedEvent.registrationLimit !== undefined &&
        updatedEvent.registrationsCount >= updatedEvent.registrationLimit
      ) {
        await EventModel.findByIdAndUpdate(eventId, {
          isPublished: false,
          autoUnpublished: true,
        });
      }

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

      const updatedEvent = await EventModel.findByIdAndUpdate(
        eventId,
        { $inc: { registrationsCount: -1 } },
        { new: true },
      );

      // If auto-unpublished because limit was reached, and capacity opens up, auto-republish
      // ONLY IF the event has not already ended!
      const now = new Date();
      if (
        updatedEvent &&
        updatedEvent.autoUnpublished &&
        new Date(updatedEvent.endDate) >= now &&
        updatedEvent.registrationLimit !== null &&
        updatedEvent.registrationLimit !== undefined &&
        updatedEvent.registrationsCount < updatedEvent.registrationLimit
      ) {
        await EventModel.findByIdAndUpdate(eventId, {
          isPublished: true,
          autoUnpublished: false,
        });
      }

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
      if (!admin || !roleHasPermission(admin.role, "events.manage", admin.permissions)) {
        return res.status(403).json({
          success: false,
          message: "Only admins can generate posters",
        });
      }

      const { prompt, colors, eventDetails, style, provider } = req.body;

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
        provider,
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
