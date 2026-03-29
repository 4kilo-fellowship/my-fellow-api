import Replicate from "replicate";
import {
  AIGenerationProvider,
  PosterGenerationOptions,
} from "./AIGenerationProvider.interface.js";

export class ReplicateProvider implements AIGenerationProvider {
  private replicate: Replicate;

  constructor() {
    const apiToken = process.env.REPLICATE_API_TOKEN;
    if (!apiToken) {
      throw new Error("REPLICATE_API_TOKEN is not defined in the environment.");
    }
    this.replicate = new Replicate({
      auth: apiToken,
    });
  }

  async generatePoster(options: PosterGenerationOptions): Promise<string> {
    const compiledPrompt = this.buildPrompt(options);

    let output: any;

    if (options.referenceImage) {
      output = await this.replicate.run(
        "stability-ai/sdxl:39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b",
        {
          input: {
            prompt: compiledPrompt,
            image: options.referenceImage,
            prompt_strength: 0.65,
            negative_prompt:
              "low quality, text, error, cropped, worst quality, lowres",
          },
        },
      );
    } else {
      output = await this.replicate.run(
        "stability-ai/sdxl:39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b",
        {
          input: {
            prompt: compiledPrompt,
            negative_prompt:
              "low quality, text, error, cropped, worst quality, lowres",
          },
        },
      );
    }

    const imageUrl = Array.isArray(output) ? output[0] : output;
    if (!imageUrl) {
      throw new Error("Failed to generate image via Replicate.");
    }

    return imageUrl;
  }

  private buildPrompt(options: PosterGenerationOptions): string {
    let prompt = `A professional event poster, high quality, photorealistic. 
Theme: ${options.prompt}. `;

    if (options.style) {
      prompt += `Style: ${options.style}. `;
    }

    if (options.colors?.primary || options.colors?.secondary) {
      prompt += `Dominant colors: ${options.colors.primary || ""} ${
        options.colors?.secondary ? "and " + options.colors.secondary : ""
      }. `;
    }

    if (options.eventDetails) {
      const db = options.eventDetails;
      let details = [];
      if (db.title) details.push(`event titled '${db.title}'`);
      if (db.location) details.push(`located at ${db.location}`);
      if (details.length > 0) {
        prompt += `Visual representation of ${details.join(", ")}. `;
      }
    }

    return prompt;
  }
}
