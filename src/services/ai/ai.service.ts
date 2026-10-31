import { fal } from "@fal-ai/client";
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
  provider?: string;
}

export class AIService {
  /**
   * Refines and enhances the user prompt using Gemini 3.5 Flash Lite
   */
  private async enhancePromptWithGemini(
    rawPrompt: string,
    style?: string,
    colors?: { primary?: string; secondary?: string },
    eventDetails?: EventMetadata,
  ): Promise<string> {
    const geminiKey = process.env.GEMINI_API_KEY;
    if (!geminiKey) return rawPrompt;

    try {
      const systemInstruction = `You are an elite graphic designer and art director for Christian campus fellowships and youth events. Convert the following event info into a vivid, single-paragraph text-to-image prompt suitable for generating an aesthetic, modern, and inspiring event poster. Include mood, lighting, color harmony, and visual elements. Do NOT include placeholder text or markdown formatting. Output ONLY the raw descriptive prompt.`;

      let context = `Theme: ${rawPrompt}\n`;
      if (style) context += `Style: ${style}\n`;
      if (colors?.primary) context += `Primary color: ${colors.primary}, Secondary: ${colors.secondary || "none"}\n`;
      if (eventDetails?.title) context += `Title: ${eventDetails.title}\n`;
      if (eventDetails?.description) context += `Description: ${eventDetails.description}\n`;

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${geminiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  { text: `${systemInstruction}\n\n${context}` },
                ],
              },
            ],
          }),
        },
      );

      if (!response.ok) {
        return rawPrompt;
      }

      const json = await response.json();
      const enhancedText = json?.candidates?.[0]?.content?.parts?.[0]?.text;
      return enhancedText && enhancedText.trim().length > 10
        ? enhancedText.trim()
        : rawPrompt;
    } catch {
      return rawPrompt;
    }
  }

  /**
   * Attempts to generate image using Gemini Image endpoints
   */
  private async tryGeminiImage(prompt: string): Promise<Buffer | null> {
    const geminiKey = process.env.GEMINI_API_KEY;
    if (!geminiKey) return null;

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-image:generateContent?key=${geminiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
          }),
        },
      );

      if (!response.ok) return null;

      const data = await response.json();
      const parts = data?.candidates?.[0]?.content?.parts || [];
      for (const part of parts) {
        if (part?.inlineData?.data) {
          return Buffer.from(part.inlineData.data, "base64");
        }
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Attempts to generate image via Fal.ai Flux
   */
  private async tryFal(prompt: string): Promise<Buffer | null> {
    const falKey = process.env.FAL_KEY;
    if (!falKey) return null;

    try {
      fal.config({ credentials: falKey });
      const result = await fal.subscribe("fal-ai/flux/dev", {
        input: {
          prompt,
          image_size: { width: 1080, height: 1350 },
          num_inference_steps: 28,
          guidance_scale: 3.5,
          num_images: 1,
          output_format: "jpeg",
          enable_safety_checker: true,
        },
      });

      const imageUrl = (result as any).data?.images?.[0]?.url;
      if (!imageUrl) return null;

      const imageResponse = await fetch(imageUrl);
      if (!imageResponse.ok) return null;

      const arrayBuffer = await imageResponse.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } catch {
      return null;
    }
  }

  /**
   * Generates image via Pollinations Flux-Realism endpoint (zero-auth free fallback)
   */
  private async tryPollinations(prompt: string): Promise<Buffer | null> {
    try {
      const cleanPrompt = encodeURIComponent(
        prompt.slice(0, 300).replace(/[^a-zA-Z0-9\s,.-]/g, " "),
      );
      const seed = Math.floor(Math.random() * 100000);
      const url = `https://image.pollinations.ai/prompt/${cleanPrompt}?model=flux-realism&seed=${seed}`;

      const res = await fetch(url, {
        headers: { "User-Agent": "MyFellow-App/1.0" },
      });

      if (!res.ok) return null;
      const contentType = res.headers.get("content-type") || "";
      if (contentType.includes("json")) return null;

      const arrayBuffer = await res.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      if (buffer.length < 5000) return null; // Reject corrupted or error JSON files
      return buffer;
    } catch {
      return null;
    }
  }

  async generatePoster(options: PosterGenerationOptions): Promise<string> {
    // 1. Build rich base prompt and enhance with Gemini 3.5
    let rawPrompt = options.prompt;
    if (options.style) rawPrompt += `, ${options.style} style`;
    if (options.colors?.primary) {
      rawPrompt += `, palette: ${options.colors.primary}`;
      if (options.colors.secondary) rawPrompt += ` and ${options.colors.secondary}`;
    }
    if (options.eventDetails?.title) {
      rawPrompt += ` for event titled "${options.eventDetails.title}"`;
    }

    const enhancedPrompt = await this.enhancePromptWithGemini(
      rawPrompt,
      options.style,
      options.colors,
      options.eventDetails,
    );

    let imageBuffer: Buffer | null = null;
    const provider = options.provider || "auto";

    // 2. Generation attempt based on provider preference
    if (provider === "gemini") {
      imageBuffer = await this.tryGeminiImage(enhancedPrompt);
    } else if (provider === "fal") {
      imageBuffer = await this.tryFal(enhancedPrompt);
    }

    // Auto / fallback cascade
    if (!imageBuffer && provider !== "gemini") {
      imageBuffer = await this.tryFal(enhancedPrompt);
    }

    if (!imageBuffer) {
      imageBuffer = await this.tryGeminiImage(enhancedPrompt);
    }

    if (!imageBuffer) {
      imageBuffer = await this.tryPollinations(enhancedPrompt);
    }

    // Ultimate safety fallback: high-res fellowship event graphic
    if (!imageBuffer) {
      const fallbackUrl =
        "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=1080&h=1350&fit=crop&q=80";
      const fallbackRes = await fetch(fallbackUrl);
      if (fallbackRes.ok) {
        const arrayBuf = await fallbackRes.arrayBuffer();
        imageBuffer = Buffer.from(arrayBuf);
      }
    }

    if (!imageBuffer) {
      throw new Error(
        "Could not generate or download a poster at this moment. Please try again or upload a photo directly.",
      );
    }

    // 3. Upload buffer to Cloudinary
    const uploadResult = await uploadImageToCloudinary(imageBuffer, {
      folder: "posters/generated",
    });

    return uploadResult.secure_url;
  }
}
