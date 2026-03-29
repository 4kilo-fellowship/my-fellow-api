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
  referenceImage?: string;
  colors?: {
    primary?: string;
    secondary?: string;
  };
  eventDetails?: EventMetadata;
  style?: string;
}

export interface AIGenerationProvider {
  generatePoster(options: PosterGenerationOptions): Promise<string>;
}
