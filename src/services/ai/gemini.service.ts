import { GoogleGenerativeAI } from "@google/generative-ai";
import { uploadImageToCloudinary } from "../cloudinary.service.js";

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

export class GeminiService {
  private genAI: GoogleGenerativeAI;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY || "";
    if (!apiKey) {
      console.warn("GEMINI_API_KEY is not defined in the environment.");
    }
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  async generatePoster(options: PosterGenerationOptions): Promise<string> {
    const model = this.genAI.getGenerativeModel({
      model: "gemini-2.5-flash-image",
    });

    const parts: any[] = [];

    let textPrompt = `You are an expert AI image generator. Please generate a highly descriptive and visually stunning event poster based on the following specifications.\nTheme/Base Prompt: ${options.prompt}\n`;

    if (options.style) textPrompt += `Style: ${options.style}\n`;
    if (options.colors?.primary)
      textPrompt += `Colors to emphasize: ${options.colors.primary} and ${
        options.colors.secondary || ""
      }\n`;
    if (options.eventDetails) {
      textPrompt += `Conceptual elements to include based on these details: ${JSON.stringify(
        options.eventDetails,
      )}\n`;
    }

    textPrompt += `\nOutput a visually cohesive, aesthetic event poster that strictly follows the requested style and colors. Do not include excessive text in the image. Integrate any reference images smoothly into the final aesthetic.`;

    parts.push({ text: textPrompt });

    if (options.referenceImages && options.referenceImages.length > 0) {
      for (const img of options.referenceImages) {
        parts.push({
          inlineData: {
            data: img.data,
            mimeType: img.mimeType,
          },
        });
      }
    }

    const result = await model.generateContent({
      contents: [{ role: "user", parts }],
      generationConfig: {
        responseModalities: ["IMAGE"],
      } as any,
    });

    const candidate = result.response?.candidates?.[0];
    const imagePart = candidate?.content?.parts?.find((p: any) => p.inlineData);

    if (!imagePart || !imagePart.inlineData?.data) {
      throw new Error(
        "Gemini returned no image data. The prompt might have been blocked or the model is overloaded.",
      );
    }

    const imageBuffer = Buffer.from(imagePart.inlineData.data, "base64");
    const uploadResult = await uploadImageToCloudinary(imageBuffer, {
      folder: "posters/generated",
    });

    return uploadResult.secure_url;
  }
}
