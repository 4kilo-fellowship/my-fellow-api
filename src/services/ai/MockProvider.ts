import {
  AIGenerationProvider,
  PosterGenerationOptions,
} from "./AIGenerationProvider.interface.js";

export class MockProvider implements AIGenerationProvider {
  async generatePoster(options: PosterGenerationOptions): Promise<string> {
    console.log("[MockProvider] Generating poster with options:", options);

    await new Promise((resolve) => setTimeout(resolve, 3000));

    return "https://images.unsplash.com/photo-1540575467063-178a50c2df87?q=80&w=2070&auto=format&fit=crop";
  }
}
