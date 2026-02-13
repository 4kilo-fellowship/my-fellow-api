import cloudinary from "cloudinary";
import { Readable } from "stream";

cloudinary.v2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || "",
  api_key: process.env.CLOUDINARY_API_KEY || "",
  api_secret: process.env.CLOUDINARY_API_SECRET || "",
});

export interface CloudinaryUploadResponse {
  secure_url: string;
  public_id: string;
  format: string;
  width: number;
  height: number;
  bytes: number;
}

export interface UploadOptions {
  folder?: string;
  transformation?: any;
  resource_type?: "image" | "video" | "raw" | "auto";
}

export const uploadImageToCloudinary = async (
  fileBuffer: Buffer,
  options: UploadOptions = {},
): Promise<CloudinaryUploadResponse> => {
  try {
    if (
      !process.env.CLOUDINARY_CLOUD_NAME ||
      !process.env.CLOUDINARY_API_KEY ||
      !process.env.CLOUDINARY_API_SECRET
    ) {
      throw new Error(
        "Cloudinary credentials not configured. Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET environment variables.",
      );
    }

    const {
      folder = "profile-images",
      transformation = {},
      resource_type = "image",
    } = options;

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.v2.uploader.upload_stream(
        {
          folder,
          resource_type,
          transformation,
        },
        (error, result) => {
          if (error) {
            reject(error);
            return;
          }

          if (!result) {
            reject(new Error("Upload succeeded but no result returned"));
            return;
          }

          resolve({
            secure_url: result.secure_url,
            public_id: result.public_id,
            format: result.format || "",
            width: result.width || 0,
            height: result.height || 0,
            bytes: result.bytes || 0,
          });
        },
      );

      const readableStream = new Readable();
      readableStream.push(fileBuffer);
      readableStream.push(null);
      readableStream.pipe(uploadStream);
    });
  } catch (error) {
    console.error("Cloudinary upload error:", error);
    throw error;
  }
};

export const deleteImageFromCloudinary = async (
  publicId: string,
): Promise<void> => {
  try {
    if (
      !process.env.CLOUDINARY_CLOUD_NAME ||
      !process.env.CLOUDINARY_API_KEY ||
      !process.env.CLOUDINARY_API_SECRET
    ) {
      throw new Error(
        "Cloudinary credentials not configured. Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET environment variables.",
      );
    }

    await cloudinary.v2.uploader.destroy(publicId);
  } catch (error) {
    console.error("Cloudinary delete error:", error);
    throw error;
  }
};

export const extractPublicIdFromUrl = (url: string): string | null => {
  try {
    const match = url.match(/\/v\d+\/(.+)\.(jpg|jpeg|png|gif|webp|svg)/i);
    return match ? match[1] : null;
  } catch {
    return null;
  }
};
