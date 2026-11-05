import { Router } from "express";
import metaRoutes from "../modules/meta/meta.routes.js";
import profileRoutes from "../modules/profiles/profile.routes.js";
import followRoutes from "../modules/follows/follow.routes.js";
import postRoutes from "../modules/posts/post.routes.js";
import interactionRoutes from "../modules/interactions/interaction.routes.js";
import feedRoutes from "../modules/feed/feed.routes.js";
import streakRoutes from "../modules/streaks/streak.routes.js";
import contentRoutes from "../modules/content/content.routes.js";
import highlightRoutes from "../modules/highlights/highlight.routes.js";
import ministryRoutes from "../modules/ministries/ministry.routes.js";
import notificationRoutes from "../modules/notifications/notification.routes.js";
import searchRoutes from "../modules/search/search.routes.js";
import mediaRoutes from "../modules/media/media.routes.js";
import actorRoutes from "../modules/actors/actor.routes.js";
import { idempotencyMiddleware } from "../platform/idempotency.js";

const v1Router = Router();

v1Router.use(idempotencyMiddleware());

v1Router.use(metaRoutes);
v1Router.use(actorRoutes);
v1Router.use(profileRoutes);
v1Router.use(followRoutes);
v1Router.use(postRoutes);
v1Router.use(interactionRoutes);
v1Router.use(feedRoutes);
v1Router.use(streakRoutes);
v1Router.use(contentRoutes);
v1Router.use(highlightRoutes);
v1Router.use(ministryRoutes);
v1Router.use(notificationRoutes);
v1Router.use(searchRoutes);
v1Router.use(mediaRoutes);

export default v1Router;
