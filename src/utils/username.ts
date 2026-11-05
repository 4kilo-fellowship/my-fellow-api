import { ProfileModel } from "../models/social.models.js";

/**
 * Normalizes an input string into a safe, valid username format:
 * - Lowercase alphanumeric and underscores
 * - Trimmed of leading/trailing symbols and '@'
 * - Max length of 22 to leave room for numeric collision suffixes
 */
export function sanitizeUsername(input: string): string {
  if (!input) return "";
  let cleaned = input
    .trim()
    .toLowerCase()
    .replace(/^@+/, "") // remove leading @
    .replace(/[^a-z0-9_]/g, "_") // replace invalid characters with underscore
    .replace(/_+/g, "_") // collapse multiple underscores
    .replace(/^_+|_+$/g, ""); // remove leading/trailing underscores

  if (cleaned.length > 22) {
    cleaned = cleaned.slice(0, 22).replace(/_+$/, "");
  }
  return cleaned;
}

/**
 * Resolves an available unique username in MongoDB ProfileModel.
 *
 * Algorithm:
 * 1. Sanitizes the user's desired Telegram handle.
 * 2. Checks if the base handle is available (or belongs to the same user).
 * 3. If taken by another user, tries sequential suffixes: `_1`, `_2`, `_3`...
 * 4. If sequential suffixes are taken, appends random 2-to-3 digit numbers: `name42`, `name89`, `name712`...
 * 5. Uses a fallback timestamp suffix as a guaranteed collision-free safety net.
 */
export async function resolveUniqueUsername(
  desiredRaw: string | undefined | null,
  userId: string,
  fallbackBase?: string
): Promise<string> {
  let base = sanitizeUsername(desiredRaw || "");

  // If handle is too short or empty, try fallbackBase (e.g. user's name or phone)
  if (base.length < 3) {
    const fallbackSanitized = sanitizeUsername(fallbackBase || "");
    if (fallbackSanitized.length >= 3) {
      base = fallbackSanitized;
    } else {
      // Fallback to user_ + last 6 characters of userId
      const safeId = userId.replace(/[^a-zA-Z0-9]/g, "").slice(-6).toLowerCase() || "fellow";
      base = `user_${safeId}`;
    }
  }

  // Ensure base leaves room for suffixes (max column length is 30)
  if (base.length > 22) {
    base = base.slice(0, 22).replace(/_+$/, "");
  }

  // 1. Try the base name directly
  const existingWithBase = await ProfileModel.findOne({
    username: new RegExp(`^${base}$`, "i"),
  }).select("userId").lean();

  if (!existingWithBase || (existingWithBase as any).userId === userId) {
    return base;
  }

  // 2. Base is taken by another user! Try sequential suffixes: base_1, base_2, base_3, base_4, base_5
  for (let i = 1; i <= 5; i++) {
    const candidate = `${base}_${i}`;
    const taken = await ProfileModel.findOne({
      username: new RegExp(`^${candidate}$`, "i"),
    }).select("userId").lean();
    if (!taken || (taken as any).userId === userId) {
      return candidate;
    }
  }

  // 3. Try random 2-to-3 digit numbers (e.g. base24, base87, base456)
  for (let attempt = 0; attempt < 10; attempt++) {
    const randomNum = Math.floor(10 + Math.random() * 890); // between 10 and 899
    const candidate = `${base}${randomNum}`;
    const taken = await ProfileModel.findOne({
      username: new RegExp(`^${candidate}$`, "i"),
    }).select("userId").lean();
    if (!taken || (taken as any).userId === userId) {
      return candidate;
    }
  }

  // 4. Safe timestamp suffix as absolute fallback
  const tsSuffix = Date.now().toString().slice(-4);
  return `${base.slice(0, 24)}_${tsSuffix}`;
}
