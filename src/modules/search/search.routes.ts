import { Router, Response } from "express";
import { optionalAuth } from "../../platform/auth.js";
import { AuthRequest } from "../../middleware/auth.middleware.js";
import { prisma } from "../../utils/prisma.js";
import { serializeUserSummary } from "../../platform/serializer.js";
import { hydratePosts } from "../posts/post.service.js";

const router = Router();

// GET /api/v1/search
router.get("/search", optionalAuth, async (req: AuthRequest, res: Response, next) => {
  try {
    const q = String(req.query.q || "").trim();
    const type = String(req.query.type || "all");
    const viewerId = req.user?.sub;

    if (!q) {
      return res.json({ users: [], posts: [], tags: [] });
    }

    const cleanQ = q.startsWith("#") ? q.slice(1) : q;

    const results: any = {};

    // Search Users
    if (type === "all" || type === "users") {
      const users = await prisma.profile.findMany({
        where: {
          OR: [
            { username: { contains: cleanQ, mode: "insensitive" } },
            { displayName: { contains: cleanQ, mode: "insensitive" } },
            { department: { contains: cleanQ, mode: "insensitive" } },
          ],
        },
        take: 15,
      });

      const avatarIds = users
        .map((u) => u.avatarAssetId)
        .filter((id): id is string => Boolean(id));
      const avatars = await prisma.mediaAsset.findMany({ where: { id: { in: avatarIds } } });
      const avatarMap = new Map(avatars.map((a) => [a.id, a]));

      results.users = users.map((u) =>
        serializeUserSummary(u, u.avatarAssetId ? avatarMap.get(u.avatarAssetId) : null)
      );
    }

    // Search Posts
    if (type === "all" || type === "posts") {
      const posts = await prisma.post.findMany({
        where: {
          body: { contains: q, mode: "insensitive" },
          deletedAt: null,
          visibility: "public",
        },
        include: {
          parent: { include: { author: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 15,
      });

      results.posts = await hydratePosts(posts, viewerId);
    }

    // Search Tags
    if (type === "all" || type === "tags") {
      const tags = await prisma.hashtag.findMany({
        where: { tag: { contains: cleanQ.toLowerCase() } },
        include: {
          _count: { select: { posts: true } },
        },
        take: 15,
      });

      results.tags = tags.map((t) => ({
        tag: `#${t.tag}`,
        rawTag: t.tag,
        postsCount: t._count.posts,
      }));
    }

    return res.json(results);
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/trending/tags
router.get("/trending/tags", async (req, res: Response, next) => {
  try {
    const tags = await prisma.hashtag.findMany({
      include: {
        _count: { select: { posts: true } },
      },
      orderBy: {
        posts: {
          _count: "desc",
        },
      },
      take: 10,
    });

    const items = tags.map((t) => ({
      tag: `#${t.tag}`,
      rawTag: t.tag,
      postsCount: t._count.posts,
    }));

    return res.json({ items });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/search/suggest
router.get("/search/suggest", async (req, res: Response, next) => {
  try {
    const q = String(req.query.q || "").trim();
    if (!q) {
      return res.json({ suggestions: [] });
    }

    const cleanQ = q.startsWith("#") ? q.slice(1).toLowerCase() : q.toLowerCase();

    const [users, tags] = await Promise.all([
      prisma.profile.findMany({
        where: {
          OR: [
            { username: { contains: cleanQ, mode: "insensitive" } },
            { displayName: { contains: cleanQ, mode: "insensitive" } },
          ],
        },
        take: 5,
        select: { username: true, displayName: true },
      }),
      prisma.hashtag.findMany({
        where: { tag: { contains: cleanQ } },
        take: 5,
        select: { tag: true },
      }),
    ]);

    const suggestions = [
      ...users.map((u) => ({ type: "user", label: `@${u.username}`, text: u.displayName })),
      ...tags.map((t) => ({ type: "tag", label: `#${t.tag}`, text: `#${t.tag}` })),
    ];

    return res.json({ suggestions });
  } catch (err) {
    next(err);
  }
});

export default router;
