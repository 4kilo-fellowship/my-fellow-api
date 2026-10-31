export interface CursorPayload {
  t: string;
  id: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  nextCursor: string | null;
  hasMore: boolean;
}

export function encodeCursor(payload: { t: string | number | Date; id: string }): string {
  const tStr = payload.t instanceof Date ? payload.t.toISOString() : String(payload.t);
  const jsonStr = JSON.stringify({ t: tStr, id: payload.id });
  return Buffer.from(jsonStr, "utf-8").toString("base64url");
}

export function decodeCursor(cursor?: string | null): CursorPayload | null {
  if (!cursor || typeof cursor !== "string") {
    return null;
  }
  try {
    const raw = Buffer.from(cursor, "base64url").toString("utf-8");
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.t === "string" && typeof parsed.id === "string") {
      return { t: parsed.t, id: parsed.id };
    }
    return null;
  } catch {
    return null;
  }
}

export function buildPaginatedResponse<T>(
  itemsWithExtra: T[],
  limit: number,
  getCursorPayload: (item: T) => { t: string | number | Date; id: string }
): PaginatedResponse<T> {
  const hasMore = itemsWithExtra.length > limit;
  const items = hasMore ? itemsWithExtra.slice(0, limit) : itemsWithExtra;
  let nextCursor: string | null = null;

  if (hasMore && items.length > 0) {
    const lastItem = items[items.length - 1];
    nextCursor = encodeCursor(getCursorPayload(lastItem));
  }

  return {
    items,
    nextCursor,
    hasMore,
  };
}
