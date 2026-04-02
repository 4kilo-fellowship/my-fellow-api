import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  AIGenerationProvider,
  PosterGenerationOptions,
} from "./AIGenerationProvider.interface.js";
import { uploadImageToCloudinary } from "../cloudinary.service.js";

export class GeminiProvider implements AIGenerationProvider {
  private genAI: GoogleGenerativeAI;
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY || "";
    if (!this.apiKey) {
      console.warn("GEMINI_API_KEY is not defined in the environment.");
    }
    this.genAI = new GoogleGenerativeAI(this.apiKey);
  }

  async generatePoster(options: PosterGenerationOptions): Promise<string> {
    const model = this.genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const parts: any[] = [];
    let textPrompt = `You are an expert AI prompt engineer for image generation. Build a highly descriptive, cohesive visual prompt for an event poster. \nTheme: ${options.prompt}\n`;

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

    parts.push({
      text:
        textPrompt +
        "\nIf reference images are provided, incorporate their visual style, layout, elements, or mood into the final descriptive prompt. Output ONLY the final image generation prompt, nothing else.",
    });

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

    let superPrompt = "";
    try {
      const result = await model.generateContent(parts);
      const responseText = result.response.text();
      superPrompt = responseText.replace(/```[a-z]*\n?|```/gi, "").trim();
    } catch (err: any) {
      console.error("[GeminiProvider] Error generating super prompt:", err);
      superPrompt = options.prompt;
    }

    // Use the optimized Imagen 4 endpoint for AI Studio keys
    const imagenUrl = `https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-001:predict?key=${this.apiKey}`;

    const body = {
      instances: [{ prompt: superPrompt.substring(0, 3900) }],
      parameters: {
        sampleCount: 1,
        aspectRatio: options.style?.toLowerCase().includes("portrait")
          ? "3:4"
          : "1:1",
        outputMimeType: "image/jpeg",
      },
    };

    const imagenRes = await fetch(imagenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!imagenRes.ok) {
      const errorData = await imagenRes.json().catch(() => ({}));
      console.error(
        "[GeminiProvider] Imagen 3 Error:",
        JSON.stringify(errorData),
      );
      throw new Error(
        `Gemini Image Gen failed: ${imagenRes.status} ${imagenRes.statusText}`,
      );
    }

    const data = (await imagenRes.json()) as any;
    const base64Image = data?.predictions?.[0]?.bytesBase64Encoded;

    if (!base64Image) {
      throw new Error(
        "Gemini returned no image data. The prompt might have been blocked or the model is overloaded.",
      );
    }

    const imageBuffer = Buffer.from(base64Image, "base64");
    const uploadResult = await uploadImageToCloudinary(imageBuffer, {
      folder: "posters/generated",
    });

    return uploadResult.secure_url;
  }
}
