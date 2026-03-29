import { AIGenerationProvider } from "./AIGenerationProvider.interface.js";
import { MockProvider } from "./MockProvider.js";
import { OpenAIProvider } from "./OpenAIProvider.js";
import { ReplicateProvider } from "./ReplicateProvider.js";

export class AIGenerationFactory {
  static getProvider(
    preferredProvider?: "openai" | "replicate",
  ): AIGenerationProvider {
    const hasOpenAI = !!process.env.OPENAI_API_KEY;
    const hasReplicate = !!process.env.REPLICATE_API_TOKEN;

    if (preferredProvider === "replicate" && hasReplicate) {
      return new ReplicateProvider();
    }
    if (preferredProvider === "openai" && hasOpenAI) {
      return new OpenAIProvider();
    }

    if (hasReplicate) {
      return new ReplicateProvider();
    }
    if (hasOpenAI) {
      return new OpenAIProvider();
    }

    console.warn(
      "[AIGenerationFactory] No AI provider API keys found. Using MockProvider fallback.",
    );
    return new MockProvider();
  }
}
