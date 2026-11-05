import { serializeMediaAsset, serializeUserSummary } from "../../platform/serializer.js";
import { PostResponse } from "../../platform/types.js";
import {
  PostModel,
  LikeModel,
  BookmarkModel,
  ProfileModel,
  MediaAssetModel,
  ActorModel,
} from "../../models/social.models.js";

export async function hydratePosts(posts: any[], viewerId?: string): Promise<PostResponse[]> {
  if (posts.length === 0) return [];

  const postIds = posts.map((p) => p.id || p._id?.toString());
  const authorIds = Array.from(new Set(posts.map((p) => p.authorId)));

  // 1. Fetch viewer interactions in parallel if viewerId is present
  let viewerLikes = new Set<string>();
  let viewerReposts = new Set<string>();
  let viewerBookmarks = new Set<string>();

  if (viewerId) {
    const [likes, reposts, bookmarks] = await Promise.all([
      LikeModel.find({ userId: viewerId, postId: { $in: postIds } }).select("postId").lean(),
      PostModel.find({
        authorId: viewerId,
        kind: "repost",
        repostOfId: { $in: postIds },
        deletedAt: null,
      }).select("repostOfId").lean(),
      BookmarkModel.find({ userId: viewerId, postId: { $in: postIds } }).select("postId").lean(),
    ]);

    viewerLikes = new Set(likes.map((l: any) => l.postId));
    viewerReposts = new Set(reposts.map((r: any) => r.repostOfId).filter(Boolean));
    viewerBookmarks = new Set(bookmarks.map((b: any) => b.postId));
  }

  // 2. Fetch authors and their avatars
  const authors = await ProfileModel.find({ userId: { $in: authorIds } }).lean();
  const authorAvatarIds = authors
    .map((a: any) => a.avatarAssetId)
    .filter((id): id is string => Boolean(id));
  const avatars = await MediaAssetModel.find({
    $or: [{ _id: { $in: authorAvatarIds } }, { id: { $in: authorAvatarIds } }],
  }).lean();
  const avatarMap = new Map(avatars.map((a: any) => [a._id ? a._id.toString() : a.id, a]));
  const authorMap = new Map(
    authors.map((a: any) => [
      a.userId,
      serializeUserSummary(a, a.avatarAssetId ? avatarMap.get(a.avatarAssetId) : null),
    ])
  );

  // 2b. Fetch actors for posts created on behalf of teams/official identities
  const actorIds = posts
    .map((p) => p.authorActorId)
    .filter((id): id is string => Boolean(id));

  const actorMap = new Map<string, any>();
  if (actorIds.length > 0) {
    const validObjectIds = actorIds.filter((id) => /^[0-9a-fA-F]{24}$/.test(id));
    const actors = await ActorModel.find({
      $or: [
        { _id: { $in: validObjectIds } },
        { handle: { $in: actorIds } },
      ],
      deletedAt: null,
    }).lean();
    for (const a of actors) {
      actorMap.set((a as any)._id.toString(), a);
      if ((a as any).handle) actorMap.set((a as any).handle, a);
    }
  }

  // 3. Media map for these posts
  const mediaMap = new Map<string, any[]>();
  const allMediaAssetIds: string[] = [];
  for (const p of posts) {
    const pId = p.id || p._id?.toString();
    const mediaItems = p.media || [];
    for (const m of mediaItems) {
      if (m.assetId) allMediaAssetIds.push(m.assetId);
    }
  }

  if (allMediaAssetIds.length > 0) {
    const postAssets = await MediaAssetModel.find({
      $or: [{ _id: { $in: allMediaAssetIds } }, { id: { $in: allMediaAssetIds } }],
    }).lean();
    const assetObjMap = new Map(postAssets.map((a: any) => [a._id ? a._id.toString() : a.id, a]));

    for (const p of posts) {
      const pId = p.id || p._id?.toString();
      const list: any[] = [];
      const mediaItems = p.media || [];
      for (const m of mediaItems) {
        const foundAsset = assetObjMap.get(m.assetId);
        const serialized = serializeMediaAsset(foundAsset, m.altText);
        if (serialized) list.push(serialized);
      }
      mediaMap.set(pId, list);
    }
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
    const targets = await PostModel.find({
      _id: { $in: targetIds },
      deletedAt: null,
    }).lean();

    const targetAuthorIds = targets.map((t: any) => t.authorId);
    const targetProfiles = await ProfileModel.find({ userId: { $in: targetAuthorIds } }).lean();
    const targetAvatarIds = targetProfiles
      .map((tp: any) => tp.avatarAssetId)
      .filter((id): id is string => Boolean(id));
    const targetAvatars = await MediaAssetModel.find({
      $or: [{ _id: { $in: targetAvatarIds } }, { id: { $in: targetAvatarIds } }],
    }).lean();
    const targetAvatarMap = new Map(targetAvatars.map((a: any) => [a._id ? a._id.toString() : a.id, a]));
    const targetProfileMap = new Map(
      targetProfiles.map((tp: any) => [
        tp.userId,
        serializeUserSummary(tp, tp.avatarAssetId ? targetAvatarMap.get(tp.avatarAssetId) : null),
      ])
    );

    for (const t of targets) {
      const tId = t._id ? t._id.toString() : t.id;
      targetPostsMap.set(tId, {
        id: tId,
        kind: t.kind as any,
        author: targetProfileMap.get(t.authorId) || {
          id: t.authorId,
          username: "unknown",
          displayName: "Unknown Member",
          avatar: null,
          isVerified: false,
        },
        body: t.body,
        createdAt: t.createdAt ? new Date(t.createdAt).toISOString() : new Date().toISOString(),
        editedAt: t.editedAt ? new Date(t.editedAt).toISOString() : null,
        media: [],
        counts: {
          replies: t.replyCount || 0,
          reposts: t.repostCount || 0,
          likes: t.likeCount || 0,
          quotes: t.quoteCount || 0,
        },
        viewer: {
          liked: viewerLikes.has(tId),
          reposted: viewerReposts.has(tId),
          bookmarked: viewerBookmarks.has(tId),
        },
      });
    }
  }

  return posts.map((p) => {
    const pId = p.id || p._id?.toString();
    const actor = p.authorActorId ? actorMap.get(p.authorActorId) : null;
    let author = authorMap.get(p.authorId) || {
      id: p.authorId,
      username: "unknown",
      displayName: "Unknown Member",
      avatar: null,
      isVerified: false,
    };

    if (actor) {
      author = {
        id: actor._id ? actor._id.toString() : actor.id,
        username: actor.handle,
        displayName: actor.displayName,
        avatar: actor.avatarUrl
          ? {
              id: actor.handle,
              kind: "image",
              width: 400,
              height: 400,
              urls: {
                sm: actor.avatarUrl,
                md: actor.avatarUrl,
                lg: actor.avatarUrl,
                original: actor.avatarUrl,
              },
            }
          : null,
        isVerified: Boolean(actor.isVerified),
        fellowshipRole: actor.type === "official" ? "Official Fellowship" : "Fellowship Team",
        ministryBadge: actor.displayName,
      };
    }

    return {
      id: pId,
      kind: p.kind as any,
      author,
      authorActor: actor
        ? {
            id: actor._id ? actor._id.toString() : actor.id,
            type: actor.type,
            displayName: actor.displayName,
            handle: actor.handle,
            avatarUrl: actor.avatarUrl,
            bio: actor.bio,
            isVerified: Boolean(actor.isVerified),
          }
        : null,
      createdByUserId: p.createdByUserId || null,
      body: p.body,
      createdAt: p.createdAt ? new Date(p.createdAt).toISOString() : new Date().toISOString(),
      editedAt: p.editedAt ? new Date(p.editedAt).toISOString() : null,
      media: mediaMap.get(pId) || [],
      replyTo: p.parentId ? { id: p.parentId, authorUsername: "fellowship" } : undefined,
      repostOf: p.repostOfId ? targetPostsMap.get(p.repostOfId) || null : null,
      quoted: p.quotedId ? targetPostsMap.get(p.quotedId) || null : null,
      counts: {
        replies: p.replyCount || 0,
        reposts: p.repostCount || 0,
        likes: p.likeCount || 0,
        quotes: p.quoteCount || 0,
      },
      viewer: {
        liked: viewerLikes.has(pId),
        reposted: viewerReposts.has(pId),
        bookmarked: viewerBookmarks.has(pId),
      },
      tombstone: p.deletedAt ? "deleted" : undefined,
    };
  });
}
