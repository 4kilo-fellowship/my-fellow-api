import { Router, Response } from "express";
import { requireAuth, AuthRequest } from "../../middleware/auth.middleware.js";
import { optionalAuth } from "../../platform/auth.js";
import { prisma } from "../../utils/prisma.js";
import { hydratePosts } from "../posts/post.service.js";
import { buildPaginatedResponse, decodeCursor } from "../../platform/pagination.js";

const router = Router();

// GET /api/v1/feed/following
router.get("/feed/following", requireAuth, async (req: AuthRequest, res: Response, next) => {
  try {
    const viewerId = req.user!.sub;
    const limit = Math.min(Number(req.query.limit) || 20, 50);
    const cursor = decodeCursor(req.query.cursor as string);

    // Get followed IDs
    const followRows = await prisma.follow.findMany({
      where: { followerId: viewerId, status: "accepted" },
      select: { followeeId: true },
    });
    const followedIds = [viewerId, ...followRows.map((f) => f.followeeId)];

    // Get blocked and muted IDs
    const [blocks, blockedBy, mutes] = await Promise.all([
      prisma.block.findMany({ where: { blockerId: viewerId }, select: { blockedId: true } }),
      prisma.block.findMany({ where: { blockedId: viewerId }, select: { blockerId: true } }),
      prisma.mute.findMany({ where: { muterId: viewerId }, select: { mutedId: true } }),
    ]);

    const excludedAuthorIds = new Set([
      ...blocks.map((b) => b.blockedId),
      ...blockedBy.map((b) => b.blockerId),
      ...mutes.map((m) => m.mutedId),
    ]);

    const candidateAuthorIds = followedIds.filter((id) => !excludedAuthorIds.has(id));

    const where: any = {
      authorId: { in: candidateAuthorIds },
      kind: { in: ["post", "repost", "quote"] },
      deletedAt: null,
    };

    if (cursor) {
      where.createdAt = { lt: new Date(cursor.t) };
    }

    const posts = await prisma.post.findMany({
      where,
      include: {
        parent: { include: { author: true } },
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: limit + 1,
    });

    const paginated = buildPaginatedResponse(posts, limit, (item) => ({
      t: item.createdAt.toISOString(),
      id: item.id,
    }));

    const hydrated = await hydratePosts(paginated.items, viewerId);

    return res.json({
      items: hydrated,
      nextCursor: paginated.nextCursor,
      hasMore: paginated.hasMore,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/feed/foryou
router.get("/feed/foryou", optionalAuth, async (req: AuthRequest, res: Response, next) => {
  try {
    const viewerId = req.user?.sub;
    const limit = Math.min(Number(req.query.limit) || 20, 50);
    const cursor = decodeCursor(req.query.cursor as string);

    let excludedAuthorIds = new Set<string>();
    if (viewerId) {
      const [blocks, blockedBy, mutes] = await Promise.all([
        prisma.block.findMany({ where: { blockerId: viewerId }, select: { blockedId: true } }),
        prisma.block.findMany({ where: { blockedId: viewerId }, select: { blockerId: true } }),
        prisma.mute.findMany({ where: { muterId: viewerId }, select: { mutedId: true } }),
      ]);
      blocks.forEach((b) => excludedAuthorIds.add(b.blockedId));
      blockedBy.forEach((b) => excludedAuthorIds.add(b.blockerId));
      mutes.forEach((m) => excludedAuthorIds.add(m.mutedId));
    }

    const where: any = {
      kind: { in: ["post", "repost", "quote"] },
      deletedAt: null,
      visibility: "public",
    };

    if (excludedAuthorIds.size > 0) {
      where.authorId = { notIn: Array.from(excludedAuthorIds) };
    }

    if (cursor) {
      where.createdAt = { lt: new Date(cursor.t) };
    }

    const posts = await prisma.post.findMany({
      where,
      include: {
        parent: { include: { author: true } },
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: limit + 1,
    });

    const paginated = buildPaginatedResponse(posts, limit, (item) => ({
      t: item.createdAt.toISOString(),
      id: item.id,
    }));

    const hydrated = await hydratePosts(paginated.items, viewerId);

    return res.json({
      items: hydrated,
      nextCursor: paginated.nextCursor,
      hasMore: paginated.hasMore,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/feed/head
router.get("/feed/head", optionalAuth, async (req: AuthRequest, res: Response, next) => {
  try {
    const viewerId = req.user?.sub;
    const since = req.query.since ? decodeCursor(req.query.since as string) : null;

    if (!since) {
      return res.json({ newCount: 0 });
    }

    const where: any = {
      deletedAt: null,
      kind: { in: ["post", "repost", "quote"] },
      createdAt: { gt: new Date(since.t) },
    };

    if (viewerId) {
      const followRows = await prisma.follow.findMany({
        where: { followerId: viewerId, status: "accepted" },
        select: { followeeId: true },
      });
      where.authorId = { in: [viewerId, ...followRows.map((f) => f.followeeId)] };
    } else {
      where.visibility = "public";
    }

    const count = await prisma.post.count({ where });

    return res.json({ newCount: Math.min(count, 50) });
  } catch (err) {
    next(err);
  }
});

export default router;
