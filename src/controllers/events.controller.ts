import { Request, Response } from "express";
import EventModel from "../models/event.model.js";
import {
  createEventSchema,
  updateEventSchema,
} from "../validators/event.validator.js";
import { createRegistrationSchema } from "../validators/registration.validator.js";
import { uploadImageToCloudinary } from "../services/cloudinary.service.js";
import RegistrationModel from "../models/registration.model.js";

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

      const events = await EventModel.find()
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
      const { id } = req.params;
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
      const { id } = req.params;
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
      const { id } = req.params;
      const removed = await EventModel.findByIdAndDelete(id).lean();
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

  static async registerForEvent(req: Request, res: Response) {
    try {
      const parseResult = createRegistrationSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: parseResult.error.format(),
        });
      }

      const data = parseResult.data;

      // Check if event exists
      const event = await EventModel.findOne({ title: data.eventTitle });
      if (!event) {
        return res.status(404).json({
          success: false,
          message: `Event with title "${data.eventTitle}" not found`,
        });
      }

      // Check if phone number already registered
      const existingRegistration = await RegistrationModel.findOne({
        phoneNumber: data.phoneNumber,
      });

      if (existingRegistration) {
        return res.status(400).json({
          success: false,
          message: "A user with this phone number is already registered",
        });
      }

      const registration = await RegistrationModel.create(data);

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

  static async getAllRegistrations(req: Request, res: Response) {
    try {
      const registrations = await RegistrationModel.find().lean();
      return res.status(200).json({ success: true, data: registrations });
    } catch (error: any) {
      return res
        .status(500)
        .json({ success: false, message: error.message || "Server error" });
    }
  }

  static async getRegistrationsByEvent(req: Request, res: Response) {
    try {
      const { eventTitle } = req.params;
      const registrations = await RegistrationModel.find({ eventTitle }).lean();
      return res.status(200).json({ success: true, data: registrations });
    } catch (error: any) {
      return res
        .status(500)
        .json({ success: false, message: error.message || "Server error" });
    }
  }
}

export default EventsController;
