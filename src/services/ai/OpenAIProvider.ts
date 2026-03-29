import OpenAI from "openai";
import {
  AIGenerationProvider,
  PosterGenerationOptions,
} from "./AIGenerationProvider.interface.js";

export class OpenAIProvider implements AIGenerationProvider {
  private openai: OpenAI;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY is not defined in the environment.");
    }
    this.openai = new OpenAI({ apiKey });
  }

  async generatePoster(options: PosterGenerationOptions): Promise<string> {
    if (options.referenceImage) {
      console.warn(
        "[OpenAIProvider] Warning: Reference images are ignored in standard DALL-E 3 prompt generation.",
      );
    }

    const compiledPrompt = this.buildPrompt(options);

    const response = await this.openai.images.generate({
      model: "dall-e-3",
      prompt: compiledPrompt,
      n: 1,
      size: "1024x1024",
      quality: "standard",
    });

    const imageUrl = response?.data?.[0]?.url;
    if (!imageUrl) {
      throw new Error("Failed to generate image via OpenAI.");
    }

    return imageUrl;
  }

  private buildPrompt(options: PosterGenerationOptions): string {
    let prompt = `Create a high-quality event poster or thumbnail. 
Core theme: ${options.prompt}. `;

    if (options.style) {
      prompt += `Style: ${options.style}. `;
    }

    if (options.colors?.primary || options.colors?.secondary) {
      prompt += `Color palette: ${options.colors.primary || ""} and ${
        options.colors.secondary || ""
      }. `;
    }

    if (options.eventDetails) {
      const db = options.eventDetails;
      prompt += `Include elements representing these event details conceptually (do not write the exact text unless suitable): 
Title: ${db.title || ""}, 
Date: ${db.date || ""} at ${db.time || ""}, 
Location: ${db.location || ""}, 
Organizer: ${db.organizer || ""}. `;
    }

    (" The result must be sharp, realistic, polished, and suitable for a high-conversion event poster.");

    return prompt.substring(0, 3900);
  }
}
