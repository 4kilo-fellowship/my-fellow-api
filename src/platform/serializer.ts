import { MediaRef, UserSummary } from "./types.js";

export function serializeMediaAsset(asset?: any | null, altText?: string | null): MediaRef | null {
  if (!asset) return null;
  const storageKey = asset.storageKey || "";
  const variants = asset.variants && typeof asset.variants === "object" ? asset.variants : {};

  return {
    id: asset.id || "media-id",
    kind: asset.mime && asset.mime.startsWith("video") ? "video" : "image",
    width: asset.width || 800,
    height: asset.height || 600,
    blurhash: asset.blurhash || undefined,
    thumbhash: asset.thumbhash || undefined,
    urls: {
      sm: variants.sm || storageKey,
      md: variants.md || storageKey,
      lg: variants.lg || storageKey,
      original: storageKey,
    },
    alt: altText || undefined,
  };
}

export function serializeUserSummary(profile: any, avatarAsset?: any | null): UserSummary {
  if (!profile) {
    return {
      id: "unknown",
      username: "unknown",
      displayName: "Unknown Member",
      avatar: null,
      isVerified: false,
      fellowshipRole: null,
      ministryBadge: null,
    };
  }

  const avatar = serializeMediaAsset(avatarAsset || profile.avatarAsset);

  return {
    id: profile.userId,
    username: profile.username,
    displayName: profile.displayName,
    avatar,
    isVerified: Boolean(profile.isVerified),
    fellowshipRole: profile.fellowshipRole || null,
    ministryBadge: profile.ministryMemberships?.[0]?.ministry?.name || null,
  };
}

export function getAcademicLabel(department?: string | null, studyYear?: number | null): string | undefined {
  if (!department && !studyYear) return undefined;
  if (department && studyYear) {
    const yearSuffix =
      studyYear === 1 ? "1st Yr" : studyYear === 2 ? "2nd Yr" : studyYear === 3 ? "3rd Yr" : `${studyYear}th Yr`;
    return `${department} • ${yearSuffix}`;
  }
  return department || `${studyYear}th Year`;
}

export function isUserOnline(lastSeenAt?: Date | null, showPresence: boolean = true): boolean {
  if (!showPresence || !lastSeenAt) return false;
  const twoMinutesAgo = Date.now() - 2 * 60 * 1000;
  return new Date(lastSeenAt).getTime() > twoMinutesAgo;
}
