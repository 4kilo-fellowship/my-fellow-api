import { Router, Response } from "express";
import { requireAuth, AuthRequest } from "../../middleware/auth.middleware.js";
import { prisma } from "../../utils/prisma.js";
import { AppError } from "../../platform/errors.js";
import { serializeMediaAsset } from "../../platform/serializer.js";
import { routeParam } from "../../utils/routeParam.js";

const router = Router();

// GET /api/v1/profiles/:username/highlights
router.get("/profiles/:username/highlights", async (req, res: Response, next) => {
  try {
    const rawUsername = routeParam(req.params.username);
    const cleanParam = rawUsername.replace(/^@/, "");

    const profile = await prisma.profile.findFirst({
      where: {
        OR: [
          { userId: cleanParam },
          { username: { equals: cleanParam, mode: "insensitive" } },
        ],
      },
    });
    if (!profile) throw AppError.notFound("Profile not found");

    const highlights = await prisma.highlight.findMany({
      where: { ownerId: profile.userId },
      include: {
        items: {
          include: {
            asset: true,
            post: {
              include: {
                media: { include: { asset: true } },
              },
            },
          },
          orderBy: { position: "asc" },
        },
      },
      orderBy: { position: "asc" },
    });

    const coverAssetIds = highlights
      .map((h) => h.coverAssetId)
      .filter((id): id is string => Boolean(id));
    const coverAssets = await prisma.mediaAsset.findMany({
      where: { id: { in: coverAssetIds } },
    });
    const coverMap = new Map(coverAssets.map((c) => [c.id, c]));

    const items = highlights.map((h) => {
      return {
        id: h.id,
        title: h.title,
        emoji: h.emoji || undefined,
        cover: h.coverAssetId ? serializeMediaAsset(coverMap.get(h.coverAssetId)) : null,
        itemsCount: h.items.length,
        items: h.items.map((item) => ({
          id: `${h.id}-${item.position}`,
          position: item.position,
          postId: item.postId,
          asset: item.asset ? serializeMediaAsset(item.asset) : null,
        })),
      };
    });

    return res.json({ items });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/highlights
router.post("/highlights", requireAuth, async (req: AuthRequest, res: Response, next) => {
  try {
    const ownerId = req.user!.sub;
    const { title, emoji, coverAssetId, items } = req.body;

    if (!title || typeof title !== "string") {
      throw AppError.badRequest("Title is required", "MISSING_TITLE");
    }

    const itemsList = Array.isArray(items) ? items : [];

    const highlight = await prisma.$transaction(async (tx) => {
      const existingCount = await tx.highlight.count({ where: { ownerId } });
      if (existingCount >= 15) {
        throw AppError.badRequest("Maximum 15 highlights allowed per profile", "MAX_HIGHLIGHTS_REACHED");
      }

      const created = await tx.highlight.create({
        data: {
          ownerId,
          title: title.slice(0, 20),
          emoji: emoji || null,
          coverAssetId: coverAssetId || null,
          position: existingCount,
        },
      });

      if (itemsList.length > 0) {
        await tx.highlightItem.createMany({
          data: itemsList.slice(0, 20).map((it: any, index: number) => ({
            highlightId: created.id,
            position: index,
            postId: it.postId || null,
            assetId: it.assetId || null,
          })),
        });
      }

      return created;
    });

    return res.status(201).json(highlight);
  } catch (err) {
    next(err);
  }
});

export default router;
