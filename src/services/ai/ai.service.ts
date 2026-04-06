import { fal } from "@fal-ai/client";
import { uploadImageToCloudinary } from "../cloudinary.service.js";

fal.config({
  credentials: process.env.FAL_KEY || "",
});

export interface EventMetadata {
  title?: string;
  date?: string;
  time?: string;
  location?: string;
  description?: string;
  ctaText?: string;
  organizer?: string;
}

export interface PosterGenerationOptions {
  prompt: string;
  referenceImages?: { mimeType: string; data: string }[];
  colors?: {
    primary?: string;
    secondary?: string;
  };
  eventDetails?: EventMetadata;
  style?: string;
}

export class AIService {
  async generatePoster(options: PosterGenerationOptions): Promise<string> {
    let textPrompt = `Create a visually stunning, high-quality event poster.\nTheme: ${options.prompt}\n`;

    if (options.style) textPrompt += `Artistic Style: ${options.style}\n`;
    if (options.colors?.primary)
      textPrompt += `Color palette: primary ${options.colors.primary}${
        options.colors.secondary
          ? `, secondary ${options.colors.secondary}`
          : ""
      }\n`;
    if (options.eventDetails) {
      const d = options.eventDetails;
      if (d.title) textPrompt += `Event Title: ${d.title}\n`;
      if (d.date) textPrompt += `Date: ${d.date}\n`;
      if (d.time) textPrompt += `Time: ${d.time}\n`;
      if (d.location) textPrompt += `Location: ${d.location}\n`;
      if (d.description) textPrompt += `Description: ${d.description}\n`;
      if (d.organizer) textPrompt += `Organized by: ${d.organizer}\n`;
    }

    textPrompt += `\nThe poster should be visually cohesive, aesthetic, and professional. Follow the requested style and color palette strictly. Make the composition eye-catching and suitable for social media sharing.`;

    try {
      const result = await fal.subscribe("fal-ai/flux/dev", {
        input: {
          prompt: textPrompt,
          image_size: {
            width: 1080,
            height: 1350,
          },
          num_inference_steps: 28,
          guidance_scale: 3.5,
          num_images: 1,
          output_format: "jpeg",
          enable_safety_checker: true,
        },
        logs: true,
        onQueueUpdate: (update) => {
          if (update.status === "IN_PROGRESS") {
            console.log("[Fal.ai] Generating poster...");
          }
        },
      });

      const imageUrl = (result as any).data?.images?.[0]?.url;
      if (!imageUrl) {
        throw new Error("Fal.ai returned no image data.");
      }
      const imageResponse = await fetch(imageUrl);
      if (!imageResponse.ok) {
        throw new Error(
          `Failed to download generated image: ${imageResponse.statusText}`,
        );
      }

      const arrayBuffer = await imageResponse.arrayBuffer();
      const imageBuffer = Buffer.from(arrayBuffer);

      const uploadResult = await uploadImageToCloudinary(imageBuffer, {
        folder: "posters/generated",
      });

      return uploadResult.secure_url;
    } catch (error: any) {
      console.error("[Fal.ai] Poster generation error:", error);
      throw new Error(`Poster generation failed: ${error.message}`);
    }
  }
}
