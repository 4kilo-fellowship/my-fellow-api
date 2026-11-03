import { Router, Response } from "express";
import { requireAuth, AuthRequest } from "../../middleware/auth.middleware.js";
import { optionalAuth } from "../../platform/auth.js";
import { prisma } from "../../utils/prisma.js";
import { AppError } from "../../platform/errors.js";
import { hydratePosts } from "./post.service.js";
import { buildPaginatedResponse, decodeCursor } from "../../platform/pagination.js";
import { routeParam } from "../../utils/routeParam.js";
import { normalizeRole } from "../../rbac/permissions.js";
import { recordStreakCheckIn } from "../streaks/streak.service.js";

const router = Router();

// POST /api/v1/posts
router.post("/posts", requireAuth, async (req: AuthRequest, res: Response, next) => {
  try {
    const authorId = req.user!.sub;
    const { body, mediaAssetIds, parentId, quotedId, visibility = "public" } = req.body;

    const trimmedBody = body ? String(body).trim() : null;
    const mediaIds = Array.isArray(mediaAssetIds) ? mediaAssetIds : [];

    if (!trimmedBody && mediaIds.length === 0) {
      throw AppError.badRequest("Post must have text or media", "EMPTY_POST");
    }

    if (trimmedBody && trimmedBody.length > 500) {
      throw AppError.badRequest("Post body cannot exceed 500 characters", "POST_TOO_LONG");
    }

    // Determine kind
    let kind: "post" | "reply" | "quote" = "post";
    let rootId: string | null = null;
    let parentAuthorId: string | null = null;

    if (parentId) {
      const parent = await prisma.post.findUnique({
        where: { id: parentId, deletedAt: null },
      });
      if (!parent) throw AppError.notFound("Parent post not found", "PARENT_NOT_FOUND");
      kind = "reply";
      rootId = parent.rootId || parent.id;
      parentAuthorId = parent.authorId;
    } else if (quotedId) {
      const quoted = await prisma.post.findUnique({
        where: { id: quotedId, deletedAt: null },
      });
      if (!quoted) throw AppError.notFound("Quoted post not found", "QUOTED_NOT_FOUND");
      kind = "quote";
    }

    const createdPost = await prisma.$transaction(async (tx) => {
      const post = await tx.post.create({
        data: {
          authorId,
          kind,
          body: trimmedBody,
          parentId: parentId || null,
          rootId,
          quotedId: quotedId || null,
          visibility,
        },
      });

      // Link media
      if (mediaIds.length > 0) {
        await tx.postMedia.createMany({
          data: mediaIds.slice(0, 4).map((assetId: string, index: number) => ({
            postId: post.id,
            assetId,
            position: index,
          })),
        });
      }

      // Hashtag extraction
      if (trimmedBody) {
        const tagMatches = trimmedBody.match(/#([a-zA-Z0-9_]+)/g);
        if (tagMatches) {
          const uniqueTags = Array.from(new Set(tagMatches.map((t) => t.slice(1).toLowerCase())));
          for (const tag of uniqueTags) {
            const hashtag = await tx.hashtag.upsert({
              where: { tag },
              create: { tag },
              update: {},
            });
            await tx.postHashtag.create({
              data: {
                postId: post.id,
                hashtagId: hashtag.id,
              },
            });
          }
        }

        // Mention extraction
        const mentionMatches = trimmedBody.match(/@([a-zA-Z0-9_]+)/g);
        if (mentionMatches) {
          const uniqueUsernames = Array.from(
            new Set(mentionMatches.map((m) => m.slice(1).toLowerCase()))
          );
          const mentionedProfiles = await tx.profile.findMany({
            where: { username: { in: uniqueUsernames } },
            select: { userId: true },
          });

          for (const mp of mentionedProfiles) {
            if (mp.userId !== authorId) {
              await tx.postMention.create({
                data: {
                  postId: post.id,
                  userId: mp.userId,
                },
              });

              // Mention notification outbox
              await tx.outboxEvent.create({
                data: {
                  type: "mention.created",
                  aggregateId: post.id,
                  payload: {
                    actorId: authorId,
                    recipientId: mp.userId,
                    postId: post.id,
                  },
                },
              });
            }
          }
        }
      }

      // Update counters
      if (kind === "post" || kind === "quote") {
        await tx.profile.update({
          where: { userId: authorId },
          data: { postsCount: { increment: 1 } },
        });
      } else if (kind === "reply" && parentId) {
        await tx.post.update({
          where: { id: parentId },
          data: { replyCount: { increment: 1 } },
        });

        // Reply notification outbox
        if (parentAuthorId && parentAuthorId !== authorId) {
          await tx.outboxEvent.create({
            data: {
              type: "reply.created",
              aggregateId: parentId,
              payload: {
                actorId: authorId,
                recipientId: parentAuthorId,
                postId: post.id,
              },
            },
          });
        }
      }

      if (quotedId) {
        await tx.post.update({
          where: { id: quotedId },
          data: { quoteCount: { increment: 1 } },
        });
      }

      // Outbox event for post.created
      await tx.outboxEvent.create({
        data: {
          type: "post.created",
          aggregateId: post.id,
          payload: {
            postId: post.id,
            authorId,
            kind,
          },
        },
      });

      return post;
    });

    // Auto check-in streak on successful reflection post
    try {
      await recordStreakCheckIn(authorId, "post");
    } catch (streakErr) {
      console.error("[Post Streak Auto-Checkin]:", streakErr);
    }

    const [hydrated] = await hydratePosts([createdPost], authorId);
    return res.status(201).json(hydrated);
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/posts/:id
router.get("/posts/:id", optionalAuth, async (req: AuthRequest, res: Response, next) => {
  try {
    const id = routeParam(req.params.id);
    const viewerId = req.user?.sub;

    const post = await prisma.post.findUnique({
      where: { id },
      include: {
        parent: { include: { author: true } },
      },
    });

    if (!post || (post.deletedAt && !post.rootId)) {
      throw AppError.notFound("Post not found", "POST_NOT_FOUND");
    }

    // Check block
    if (viewerId) {
      const block = await prisma.block.findFirst({
        where: {
          OR: [
            { blockerId: viewerId, blockedId: post.authorId },
            { blockerId: post.authorId, blockedId: viewerId },
          ],
        },
      });
      if (block) throw AppError.notFound("Post not found", "POST_NOT_FOUND");
    }

    const [hydrated] = await hydratePosts([post], viewerId);
    return res.json(hydrated);
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/posts/:id/thread
router.get("/posts/:id/thread", optionalAuth, async (req: AuthRequest, res: Response, next) => {
  try {
    const id = routeParam(req.params.id);
    const viewerId = req.user?.sub;
    const limit = Math.min(Number(req.query.limit) || 20, 50);

    const focusPost = await prisma.post.findUnique({
      where: { id },
      include: { parent: { include: { author: true } } },
    });
    if (!focusPost) throw AppError.notFound("Post not found", "POST_NOT_FOUND");

    // Fetch ancestors (walk up parents)
    const ancestorsRaw: any[] = [];
    let currentParentId = focusPost.parentId;
    while (currentParentId && ancestorsRaw.length < 10) {
      const parent = await prisma.post.findUnique({
        where: { id: currentParentId },
        include: { parent: { include: { author: true } } },
      });
      if (!parent) break;
      ancestorsRaw.unshift(parent);
      currentParentId = parent.parentId;
    }

    // Fetch direct replies
    const repliesRaw = await prisma.post.findMany({
      where: {
        parentId: id,
        deletedAt: null,
      },
      include: { parent: { include: { author: true } } },
      orderBy: { createdAt: "asc" },
      take: limit + 1,
    });

    const [hydratedFocus] = await hydratePosts([focusPost], viewerId);
    const hydratedAncestors = await hydratePosts(ancestorsRaw, viewerId);
    const paginatedReplies = buildPaginatedResponse(repliesRaw, limit, (item) => ({
      t: item.createdAt.toISOString(),
      id: item.id,
    }));
    const hydratedReplies = await hydratePosts(paginatedReplies.items, viewerId);

    return res.json({
      ancestors: hydratedAncestors,
      focus: hydratedFocus,
      replies: {
        items: hydratedReplies,
        nextCursor: paginatedReplies.nextCursor,
        hasMore: paginatedReplies.hasMore,
      },
    });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/v1/posts/:id
router.patch("/posts/:id", requireAuth, async (req: AuthRequest, res: Response, next) => {
  try {
    const userId = req.user!.sub;
    const id = routeParam(req.params.id);
    const { body } = req.body;

    const post = await prisma.post.findUnique({ where: { id } });
    if (!post || post.deletedAt) throw AppError.notFound("Post not found", "POST_NOT_FOUND");

    if (post.authorId !== userId) {
      throw AppError.forbidden("You can only edit your own posts", "NOT_AUTHOR");
    }

    // Edit window check (30 minutes)
    const postAgeMs = Date.now() - post.createdAt.getTime();
    if (postAgeMs > 30 * 60 * 1000) {
      throw AppError.badRequest("Edit window has expired (30 minutes)", "EDIT_WINDOW_EXPIRED");
    }

    const trimmed = String(body || "").trim();
    if (!trimmed) throw AppError.badRequest("Post body cannot be empty", "EMPTY_BODY");

    const updated = await prisma.post.update({
      where: { id },
      data: {
        body: trimmed.slice(0, 500),
        editedAt: new Date(),
      },
    });

    const [hydrated] = await hydratePosts([updated], userId);
    return res.json(hydrated);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/v1/posts/:id
router.delete("/posts/:id", requireAuth, async (req: AuthRequest, res: Response, next) => {
  try {
    const userId = req.user!.sub;
    const id = routeParam(req.params.id);

    const post = await prisma.post.findUnique({ where: { id } });
    if (!post || post.deletedAt) throw AppError.notFound("Post not found", "POST_NOT_FOUND");

    const isPrivileged = ["super_admin", "leader"].includes(
      normalizeRole(req.user?.role),
    );
    if (post.authorId !== userId && !isPrivileged) {
      throw AppError.forbidden("You can only delete your own posts", "NOT_AUTHOR");
    }

    await prisma.$transaction(async (tx) => {
      await tx.post.update({
        where: { id },
        data: { deletedAt: new Date() },
      });

      if (post.kind === "post" || post.kind === "quote") {
        await tx.profile.update({
          where: { userId: post.authorId },
          data: { postsCount: { decrement: 1 } },
        });
      } else if (post.kind === "reply" && post.parentId) {
        await tx.post.update({
          where: { id: post.parentId },
          data: { replyCount: { decrement: 1 } },
        });
      }
    });

    return res.json({ success: true, id });
  } catch (err) {
    next(err);
  }
});

// PUT /api/v1/posts/:id/repost
router.put("/posts/:id/repost", requireAuth, async (req: AuthRequest, res: Response, next) => {
  try {
    const authorId = req.user!.sub;
    const targetPostId = routeParam(req.params.id);

    const originalPost = await prisma.post.findUnique({
      where: { id: targetPostId, deletedAt: null },
    });
    if (!originalPost) throw AppError.notFound("Post not found", "POST_NOT_FOUND");

    // Reposting a repost points to the original root post
    const actualTargetId = originalPost.repostOfId || originalPost.id;

    const result = await prisma.$transaction(async (tx) => {
      const existingRepost = await tx.post.findFirst({
        where: {
          authorId,
          kind: "repost",
          repostOfId: actualTargetId,
          deletedAt: null,
        },
      });

      if (existingRepost) {
        const p = await tx.post.findUnique({ where: { id: actualTargetId } });
        return { reposted: true, repostCount: p?.repostCount || 0 };
      }

      await tx.post.create({
        data: {
          authorId,
          kind: "repost",
          repostOfId: actualTargetId,
        },
      });

      const updated = await tx.post.update({
        where: { id: actualTargetId },
        data: { repostCount: { increment: 1 } },
      });

      if (originalPost.authorId !== authorId) {
        await tx.outboxEvent.create({
          data: {
            type: "repost.created",
            aggregateId: actualTargetId,
            payload: {
              actorId: authorId,
              recipientId: originalPost.authorId,
              postId: actualTargetId,
            },
          },
        });
      }

      return { reposted: true, repostCount: updated.repostCount };
    });

    return res.json(result);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/v1/posts/:id/repost
router.delete("/posts/:id/repost", requireAuth, async (req: AuthRequest, res: Response, next) => {
  try {
    const authorId = req.user!.sub;
    const targetPostId = routeParam(req.params.id);

    const result = await prisma.$transaction(async (tx) => {
      const existingRepost = await tx.post.findFirst({
        where: {
          authorId,
          kind: "repost",
          repostOfId: targetPostId,
          deletedAt: null,
        },
      });

      if (!existingRepost) {
        const p = await tx.post.findUnique({ where: { id: targetPostId } });
        return { reposted: false, repostCount: p?.repostCount || 0 };
      }

      await tx.post.delete({ where: { id: existingRepost.id } });

      const updated = await tx.post.update({
        where: { id: targetPostId },
        data: { repostCount: { decrement: 1 } },
      });

      return { reposted: false, repostCount: Math.max(0, updated.repostCount) };
    });

    return res.json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
