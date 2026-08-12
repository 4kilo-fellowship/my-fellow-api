import { Request, Response } from "express";
import DevotionModel from "../models/devotion.model.js";
import {
  createDevotionSchema,
  updateDevotionSchema,
} from "../validators/devotion.validator.js";
import {
  uploadDevotionImage,
  uploadDevotionMedia,
  deleteDevotionAssets,
  queryDevotions,
  incrementViews,
  toggleLike,
  formatCount,
  DevotionQueryOptions,
} from "../services/devotion.service.js";
import { routeParam } from "../utils/routeParam.js";

// ─── Helper: extract uploaded files from req.files ──────────────────
function getUploadedFiles(req: Request) {
  const files = req.files as
    | { [fieldname: string]: Express.Multer.File[] }
    | undefined;

  return {
    imageFile: files?.["image"]?.[0] || null,
    mediaFile: files?.["media"]?.[0] || null,
  };
}

export class DevotionController {
  // ─── CREATE ─────────────────────────────────────────────────────────
  static async createDevotion(req: Request, res: Response) {
    try {
      const parseResult = createDevotionSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: parseResult.error.format(),
        });
      }

      const data = parseResult.data;
      const { imageFile, mediaFile } = getUploadedFiles(req);

      // ── Handle cover image ──────────────────────────────────────────
      let imageUrl: string | undefined = data.image;
      let imagePublicId: string | undefined;

      if (imageFile) {
        const result = await uploadDevotionImage(imageFile.buffer);
        imageUrl = result.secure_url;
        imagePublicId = result.public_id;
      }

      if (!imageUrl) {
        return res.status(400).json({
          success: false,
          message:
            "A cover image is required: upload via 'image' field or provide image URL in body",
        });
      }

      // ── Handle type-specific media ──────────────────────────────────
      let audioUrl: string | undefined = data.audioUrl;
      let audioPublicId: string | undefined;
      let pdfUrl: string | undefined = data.pdfUrl;
      let pdfPublicId: string | undefined;
      let bookUrl: string | undefined = data.bookUrl;
      let bookPublicId: string | undefined;

      if (mediaFile) {
        const result = await uploadDevotionMedia(mediaFile.buffer, data.type);

        switch (data.type) {
          case "voice":
            audioUrl = result.secure_url;
            audioPublicId = result.public_id;
            break;
          case "pdf":
            pdfUrl = result.secure_url;
            pdfPublicId = result.public_id;
            break;
          case "book":
            bookUrl = result.secure_url;
            bookPublicId = result.public_id;
            break;
        }
      }

      // Validate that media-dependent types have their media
      if (data.type === "voice" && !audioUrl) {
        return res.status(400).json({
          success: false,
          message:
            "Voice devotions require an audio file (upload via 'media' field) or an 'audioUrl'",
        });
      }

      if (data.type === "pdf" && !pdfUrl) {
        return res.status(400).json({
          success: false,
          message:
            "PDF devotions require a PDF file (upload via 'media' field) or a 'pdfUrl'",
        });
      }

      if (data.type === "book" && !bookUrl) {
        return res.status(400).json({
          success: false,
          message:
            "Book devotions require a book file (upload via 'media' field) or a 'bookUrl'",
        });
      }

      const created = await DevotionModel.create({
        title: data.title,
        author: data.author,
        date: data.date,
        type: data.type,
        views: data.views ?? 0,
        likes: data.likes ?? 0,
        image: imageUrl,
        imagePublicId,
        content: data.content,
        audioUrl,
        audioPublicId,
        duration: data.duration,
        caption: data.caption,
        pdfUrl,
        pdfPublicId,
        pageCount: data.pageCount,
        bookUrl,
        bookPublicId,
        bookFormat: data.bookFormat,
        tags: data.tags,
        featured: data.featured ?? false,
      });

      return res.status(201).json({ success: true, data: created });
    } catch (error: any) {
      return res
        .status(500)
        .json({ success: false, message: error.message || "Server error" });
    }
  }

  // ─── GET ALL (paginated, filterable, searchable) ──────────────────
  static async getAllDevotions(req: Request, res: Response) {
    try {
      const options: DevotionQueryOptions = {
        type: req.query.type as string,
        featured: req.query.featured as string,
        tags: req.query.tags as string,
        page: req.query.page as string,
        limit: req.query.limit as string,
        search: req.query.search as string,
      };

      const { devotions, pagination } = await queryDevotions(options);

      // Format views/likes for frontend consumption
      const formatted = devotions.map((d: any) => ({
        ...d,
        viewsFormatted: formatCount(d.views),
        likesFormatted: formatCount(d.likes),
      }));

      return res.status(200).json({
        success: true,
        data: formatted,
        pagination,
      });
    } catch (error: any) {
      return res
        .status(500)
        .json({ success: false, message: error.message || "Server error" });
    }
  }

  // ─── GET BY ID ────────────────────────────────────────────────────
  static async getDevotionById(req: Request, res: Response) {
    try {
      const id = routeParam(req.params.id);
      const devotion = await DevotionModel.findById(id).lean();
      if (!devotion) {
        return res
          .status(404)
          .json({ success: false, message: "Devotion not found" });
      }

      return res.status(200).json({
        success: true,
        data: {
          ...devotion,
          viewsFormatted: formatCount(devotion.views),
          likesFormatted: formatCount(devotion.likes),
        },
      });
    } catch (error: any) {
      return res
        .status(500)
        .json({ success: false, message: error.message || "Server error" });
    }
  }

  // ─── UPDATE ───────────────────────────────────────────────────────
  static async updateDevotion(req: Request, res: Response) {
    try {
      const id = routeParam(req.params.id);
      const existing = await DevotionModel.findById(id);
      if (!existing) {
        return res
          .status(404)
          .json({ success: false, message: "Devotion not found" });
      }

      const parseResult = updateDevotionSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: parseResult.error.format(),
        });
      }

      const data: any = { ...parseResult.data };
      const { imageFile, mediaFile } = getUploadedFiles(req);

      // ── Replace cover image if new one uploaded ─────────────────────
      if (imageFile) {
        const result = await uploadDevotionImage(imageFile.buffer);
        data.image = result.secure_url;
        data.imagePublicId = result.public_id;
      }

      // ── Replace media file if new one uploaded ──────────────────────
      if (mediaFile) {
        const type = data.type || existing.type;
        const result = await uploadDevotionMedia(mediaFile.buffer, type);

        switch (type) {
          case "voice":
            data.audioUrl = result.secure_url;
            data.audioPublicId = result.public_id;
            break;
          case "pdf":
            data.pdfUrl = result.secure_url;
            data.pdfPublicId = result.public_id;
            break;
          case "book":
            data.bookUrl = result.secure_url;
            data.bookPublicId = result.public_id;
            break;
        }
      }

      const updated = await DevotionModel.findByIdAndUpdate(id, data, {
        new: true,
      }).lean();

      return res.status(200).json({ success: true, data: updated });
    } catch (error: any) {
      return res
        .status(500)
        .json({ success: false, message: error.message || "Server error" });
    }
  }

  // ─── DELETE (with Cloudinary cleanup) ─────────────────────────────
  static async deleteDevotion(req: Request, res: Response) {
    try {
      const id = routeParam(req.params.id);
      const devotion = await DevotionModel.findById(id);
      if (!devotion) {
        return res
          .status(404)
          .json({ success: false, message: "Devotion not found" });
      }

      // Clean up all uploaded assets from Cloudinary
      await deleteDevotionAssets(devotion);

      await DevotionModel.findByIdAndDelete(id);

      return res
        .status(200)
        .json({ success: true, message: "Devotion deleted" });
    } catch (error: any) {
      return res
        .status(500)
        .json({ success: false, message: error.message || "Server error" });
    }
  }

  // ─── INCREMENT VIEWS ──────────────────────────────────────────────
  static async recordView(req: Request, res: Response) {
    try {
      const id = routeParam(req.params.id);
      const updated = await incrementViews(id);
      if (!updated) {
        return res
          .status(404)
          .json({ success: false, message: "Devotion not found" });
      }
      return res.status(200).json({
        success: true,
        data: {
          views: updated.views,
          viewsFormatted: formatCount(updated.views),
        },
      });
    } catch (error: any) {
      return res
        .status(500)
        .json({ success: false, message: error.message || "Server error" });
    }
  }

  // ─── LIKE / UNLIKE ────────────────────────────────────────────────
  static async likeDevotion(req: Request, res: Response) {
    try {
      const id = routeParam(req.params.id);
      const { action } = req.body; // "like" or "unlike"
      const isLike = action !== "unlike";

      const updated = await toggleLike(id, isLike);
      if (!updated) {
        return res
          .status(404)
          .json({ success: false, message: "Devotion not found" });
      }
      return res.status(200).json({
        success: true,
        data: {
          likes: updated.likes,
          likesFormatted: formatCount(updated.likes),
        },
      });
    } catch (error: any) {
      return res
        .status(500)
        .json({ success: false, message: error.message || "Server error" });
    }
  }
}

export default DevotionController;
