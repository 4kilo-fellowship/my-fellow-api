import { Request, Response } from "express";
import { LocationService } from "../services/location.service.js";
import { locationBaseSchema } from "../validators/location.validator.js";

export class LocationController {
  private static parseMultipartBody(body: any): any {
    const data = { ...body };
    const jsonFields = ["coordinates", "serviceTimes"];

    jsonFields.forEach((field) => {
      if (typeof data[field] === "string") {
        try {
          data[field] = JSON.parse(data[field]);
        } catch (e) {
          // If it's not JSON, it might be a single value for an array field
          if (field === "serviceTimes") {
            data[field] = [data[field]];
          }
        }
      }
    });

    return data;
  }

  static async createLocation(req: Request, res: Response) {
    try {
      let data = LocationController.parseMultipartBody(req.body);

      const parseResult = locationBaseSchema.safeParse(data);

      if (!parseResult.success) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: parseResult.error.format(),
        });
      }

      const location = await LocationService.create(parseResult.data, req.file);

      return res.status(201).json({
        success: true,
        message: "Location created successfully",
        data: location,
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message || "Server error",
      });
    }
  }

  static async getAllLocations(req: Request, res: Response) {
    try {
      const query = {
        search: (req.query.search as string) || undefined,
      };

      const locations = await LocationService.getAll(query);

      return res.status(200).json({
        success: true,
        data: locations,
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message || "Server error",
      });
    }
  }

  static async getLocationById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const location = await LocationService.getById(id);

      if (!location) {
        return res.status(404).json({
          success: false,
          message: "Location not found",
        });
      }

      return res.status(200).json({
        success: true,
        data: location,
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message || "Server error",
      });
    }
  }

  static async updateLocation(req: Request, res: Response) {
    try {
      let data = LocationController.parseMultipartBody(req.body);

      const parseResult = locationBaseSchema.partial().safeParse(data);

      if (!parseResult.success) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: parseResult.error.format(),
        });
      }

      const { id } = req.params;

      const updatedLocation = await LocationService.update(
        id,
        parseResult.data,
        req.file,
      );

      if (!updatedLocation) {
        return res.status(404).json({
          success: false,
          message: "Location not found",
        });
      }

      return res.status(200).json({
        success: true,
        message: "Location updated successfully",
        data: updatedLocation,
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message || "Server error",
      });
    }
  }

  static async deleteLocation(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const success = await LocationService.delete(id);

      if (!success) {
        return res.status(404).json({
          success: false,
          message: "Location not found",
        });
      }

      return res.status(200).json({
        success: true,
        message: "Location deleted successfully",
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message || "Server error",
      });
    }
  }
}

export default LocationController;
