import { prisma } from "../../utils/prisma.js";
import { serializeMediaAsset, serializeUserSummary } from "../../platform/serializer.js";
import { PostResponse } from "../../platform/types.js";

export async function hydratePosts(posts: any[], viewerId?: string): Promise<PostResponse[]> {
  if (posts.length === 0) return [];

  const postIds = posts.map((p) => p.id);
  const authorIds = Array.from(new Set(posts.map((p) => p.authorId)));

  // 1. Fetch viewer interactions in parallel if viewerId is present
  let viewerLikes = new Set<string>();
  let viewerReposts = new Set<string>();
  let viewerBookmarks = new Set<string>();

  if (viewerId) {
    const [likes, reposts, bookmarks] = await Promise.all([
      prisma.like.findMany({
        where: { userId: viewerId, postId: { in: postIds } },
        select: { postId: true },
      }),
      prisma.post.findMany({
        where: {
          authorId: viewerId,
          kind: "repost",
          repostOfId: { in: postIds },
          deletedAt: null,
        },
        select: { repostOfId: true },
      }),
      prisma.bookmark.findMany({
        where: { userId: viewerId, postId: { in: postIds } },
        select: { postId: true },
      }),
    ]);

    viewerLikes = new Set(likes.map((l) => l.postId));
    viewerReposts = new Set(reposts.map((r) => r.repostOfId!).filter(Boolean));
    viewerBookmarks = new Set(bookmarks.map((b) => b.postId));
  }

  // 2. Fetch authors and their avatars
  const authors = await prisma.profile.findMany({
    where: { userId: { in: authorIds } },
    include: { ministryMemberships: { include: { ministry: true } } },
  });
  const authorAvatarIds = authors
    .map((a) => a.avatarAssetId)
    .filter((id): id is string => Boolean(id));
  const avatars = await prisma.mediaAsset.findMany({ where: { id: { in: authorAvatarIds } } });
  const avatarMap = new Map(avatars.map((a) => [a.id, a]));
  const authorMap = new Map(
    authors.map((a) => [
      a.userId,
      serializeUserSummary(a, a.avatarAssetId ? avatarMap.get(a.avatarAssetId) : null),
    ])
  );

  // 3. Fetch media for these posts
  const postMedias = await prisma.postMedia.findMany({
    where: { postId: { in: postIds } },
    include: { asset: true },
    orderBy: { position: "asc" },
  });
  const mediaMap = new Map<string, any[]>();
  for (const pm of postMedias) {
    const list = mediaMap.get(pm.postId) || [];
    const serialized = serializeMediaAsset(pm.asset, pm.altText);
    if (serialized) list.push(serialized);
    mediaMap.set(pm.postId, list);
  }

  // 4. Repost & Quote target hydration
  const repostTargetIds = posts
    .map((p) => p.repostOfId)
    .filter((id): id is string => Boolean(id));
  const quoteTargetIds = posts
    .map((p) => p.quotedId)
    .filter((id): id is string => Boolean(id));
  const targetIds = Array.from(new Set([...repostTargetIds, ...quoteTargetIds]));

  let targetPostsMap = new Map<string, any>();
  if (targetIds.length > 0) {
    const targets = await prisma.post.findMany({
      where: { id: { in: targetIds }, deletedAt: null },
      include: {
        author: { include: { ministryMemberships: { include: { ministry: true } } } },
        media: { include: { asset: true }, orderBy: { position: "asc" } },
      },
    });

    const targetAvatarIds = targets
      .map((t) => t.author?.avatarAssetId)
      .filter((id): id is string => Boolean(id));
    const targetAvatars = await prisma.mediaAsset.findMany({
      where: { id: { in: targetAvatarIds } },
    });
    const targetAvatarMap = new Map(targetAvatars.map((a) => [a.id, a]));

    for (const t of targets) {
      targetPostsMap.set(t.id, {
        id: t.id,
        kind: t.kind as any,
        author: serializeUserSummary(
          t.author,
          t.author?.avatarAssetId ? targetAvatarMap.get(t.author.avatarAssetId) : null
        ),
        body: t.body,
        createdAt: t.createdAt.toISOString(),
        editedAt: t.editedAt?.toISOString() || null,
        media: (t.media || [])
          .map((m: any) => serializeMediaAsset(m.asset, m.altText))
          .filter(Boolean),
        counts: {
          replies: t.replyCount,
          reposts: t.repostCount,
          likes: t.likeCount,
          quotes: t.quoteCount,
        },
        viewer: {
          liked: viewerLikes.has(t.id),
          reposted: viewerReposts.has(t.id),
          bookmarked: viewerBookmarks.has(t.id),
        },
      });
    }
  }

  return posts.map((p) => {
    const author = authorMap.get(p.authorId) || {
      id: p.authorId,
      username: "unknown",
      displayName: "Unknown Member",
      avatar: null,
      isVerified: false,
    };

    return {
      id: p.id,
      kind: p.kind as any,
      author,
      body: p.body,
      createdAt: p.createdAt.toISOString(),
      editedAt: p.editedAt?.toISOString() || null,
      media: mediaMap.get(p.id) || [],
      replyTo: p.parent?.author
        ? { id: p.parent.id, authorUsername: p.parent.author.username }
        : undefined,
      repostOf: p.repostOfId ? targetPostsMap.get(p.repostOfId) || null : null,
      quoted: p.quotedId ? targetPostsMap.get(p.quotedId) || null : null,
      counts: {
        replies: p.replyCount,
        reposts: p.repostCount,
        likes: p.likeCount,
        quotes: p.quoteCount,
      },
      viewer: {
        liked: viewerLikes.has(p.id),
        reposted: viewerReposts.has(p.id),
        bookmarked: viewerBookmarks.has(p.id),
      },
      tombstone: p.deletedAt ? "deleted" : undefined,
    };
  });
}
