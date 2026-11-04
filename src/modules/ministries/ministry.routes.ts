import { Router, Response } from "express";
import { prisma } from "../../utils/prisma.js";
import { AppError } from "../../platform/errors.js";
import { serializeMediaAsset } from "../../platform/serializer.js";
import { routeParam } from "../../utils/routeParam.js";

const router = Router();

// GET /api/v1/ministries
router.get("/ministries", async (req, res: Response, next) => {
  try {
    const ministries = await prisma.ministry.findMany({
      include: {
        _count: { select: { members: true, events: true } },
      },
      orderBy: { name: "asc" },
    });

    const coverAssetIds = ministries
      .map((m) => m.coverAssetId)
      .filter((id): id is string => Boolean(id));
    const covers = await prisma.mediaAsset.findMany({
      where: { id: { in: coverAssetIds } },
    });
    const coverMap = new Map(covers.map((c) => [c.id, c]));

    const items = ministries.map((m) => ({
      id: m.id,
      slug: m.slug,
      name: m.name,
      description: m.description,
      cover: m.coverAssetId ? serializeMediaAsset(coverMap.get(m.coverAssetId)) : null,
      membersCount: m._count.members,
      eventsCount: m._count.events,
    }));

    return res.json({ items });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/profiles/:username/ministries
router.get("/profiles/:username/ministries", async (req, res: Response, next) => {
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

    const memberships = await prisma.ministryMember.findMany({
      where: { userId: profile.userId },
      include: {
        ministry: {
          include: {
            events: {
              where: {
                startsAt: { gte: new Date() },
              },
              orderBy: { startsAt: "asc" },
              take: 5,
            },
          },
        },
      },
    });

    const items = memberships.map((m) => ({
      ministryId: m.ministryId,
      slug: m.ministry.slug,
      name: m.ministry.name,
      description: m.ministry.description,
      role: m.role,
      status: m.status,
      joinedAt: m.joinedAt.toISOString(),
      upcomingEvents: m.ministry.events.map((e) => ({
        id: e.id,
        title: e.title,
        description: e.description,
        location: e.location,
        startsAt: e.startsAt.toISOString(),
        endsAt: e.endsAt?.toISOString() || null,
        recurrenceRule: e.recurrenceRule,
      })),
    }));

    return res.json({ items });
  } catch (err) {
    next(err);
  }
});

export default router;
