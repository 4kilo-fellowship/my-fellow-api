import { Router, Response } from "express";
import { requireAuth, AuthRequest } from "../../middleware/auth.middleware.js";
import { prisma } from "../../utils/prisma.js";
import { AppError } from "../../platform/errors.js";
import { hydratePosts } from "../posts/post.service.js";
import { buildPaginatedResponse, decodeCursor } from "../../platform/pagination.js";
import { routeParam } from "../../utils/routeParam.js";

const router = Router();

// PUT /api/v1/posts/:id/like
router.put("/posts/:id/like", requireAuth, async (req: AuthRequest, res: Response, next) => {
  try {
    const userId = req.user!.sub;
    const postId = routeParam(req.params.id);

    const post = await prisma.post.findUnique({
      where: { id: postId, deletedAt: null },
    });
    if (!post) throw AppError.notFound("Post not found", "POST_NOT_FOUND");

    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.like.findUnique({
        where: { userId_postId: { userId, postId } },
      });

      if (existing) {
        return { liked: true, likeCount: post.likeCount };
      }

      await tx.like.create({
        data: { userId, postId },
      });

      const updated = await tx.post.update({
        where: { id: postId },
        data: { likeCount: { increment: 1 } },
      });

      if (post.authorId !== userId) {
        await tx.outboxEvent.create({
          data: {
            type: "like.created",
            aggregateId: postId,
            payload: {
              actorId: userId,
              recipientId: post.authorId,
              postId,
            },
          },
        });
      }

      return { liked: true, likeCount: updated.likeCount };
    });

    return res.json(result);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/v1/posts/:id/like
router.delete("/posts/:id/like", requireAuth, async (req: AuthRequest, res: Response, next) => {
  try {
    const userId = req.user!.sub;
    const postId = routeParam(req.params.id);

    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.like.findUnique({
        where: { userId_postId: { userId, postId } },
      });

      if (!existing) {
        const p = await tx.post.findUnique({ where: { id: postId } });
        return { liked: false, likeCount: p?.likeCount || 0 };
      }

      await tx.like.delete({
        where: { userId_postId: { userId, postId } },
      });

      const updated = await tx.post.update({
        where: { id: postId },
        data: { likeCount: { decrement: 1 } },
      });

      return { liked: false, likeCount: Math.max(0, updated.likeCount) };
    });

    return res.json(result);
  } catch (err) {
    next(err);
  }
});

// PUT /api/v1/posts/:id/bookmark
router.put("/posts/:id/bookmark", requireAuth, async (req: AuthRequest, res: Response, next) => {
  try {
    const userId = req.user!.sub;
    const postId = routeParam(req.params.id);

    const post = await prisma.post.findUnique({
      where: { id: postId, deletedAt: null },
    });
    if (!post) throw AppError.notFound("Post not found", "POST_NOT_FOUND");

    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.bookmark.findUnique({
        where: { userId_postId: { userId, postId } },
      });

      if (existing) {
        return { bookmarked: true };
      }

      await tx.bookmark.create({
        data: { userId, postId },
      });

      await tx.post.update({
        where: { id: postId },
        data: { bookmarkCount: { increment: 1 } },
      });

      return { bookmarked: true };
    });

    return res.json(result);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/v1/posts/:id/bookmark
router.delete("/posts/:id/bookmark", requireAuth, async (req: AuthRequest, res: Response, next) => {
  try {
    const userId = req.user!.sub;
    const postId = routeParam(req.params.id);

    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.bookmark.findUnique({
        where: { userId_postId: { userId, postId } },
      });

      if (!existing) {
        return { bookmarked: false };
      }

      await tx.bookmark.delete({
        where: { userId_postId: { userId, postId } },
      });

      await tx.post.update({
        where: { id: postId },
        data: { bookmarkCount: { decrement: 1 } },
      });

      return { bookmarked: false };
    });

    return res.json(result);
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/me/bookmarks
router.get("/me/bookmarks", requireAuth, async (req: AuthRequest, res: Response, next) => {
  try {
    const userId = req.user!.sub;
    const limit = Math.min(Number(req.query.limit) || 20, 50);
    const cursor = decodeCursor(req.query.cursor as string);

    const where: any = { userId };
    if (cursor) {
      where.createdAt = { lt: new Date(cursor.t) };
    }

    const bookmarkEntries = await prisma.bookmark.findMany({
      where,
      include: {
        post: {
          include: {
            parent: { include: { author: true } },
          },
        },
      },
      orderBy: [{ createdAt: "desc" }, { postId: "desc" }],
      take: limit + 1,
    });

    const activeEntries = bookmarkEntries.filter((b) => b.post && !b.post.deletedAt);
    const paginated = buildPaginatedResponse(activeEntries, limit, (item) => ({
      t: item.createdAt.toISOString(),
      id: item.postId,
    }));

    const hydratedPosts = await hydratePosts(
      paginated.items.map((i) => i.post),
      userId
    );

    return res.json({
      items: hydratedPosts,
      nextCursor: paginated.nextCursor,
      hasMore: paginated.hasMore,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
