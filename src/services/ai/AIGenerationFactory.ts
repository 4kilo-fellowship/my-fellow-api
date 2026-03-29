import { AIGenerationProvider } from "./AIGenerationProvider.interface.js";
import { GeminiProvider } from "./GeminiProvider.js";

export class AIGenerationFactory {
  static getProvider(): AIGenerationProvider {
    return new GeminiProvider();
  }
}
