# ADR 0001: Social Data Domain Model & Storage Engine

## Status
Accepted

## Context
The application backend (`my-fellow-api`) operates in a dual-database environment:
1. **MongoDB Atlas** (via Mongoose and Better Auth) currently stores core account users, sessions, fellowship teams, events, and devotions.
2. **PostgreSQL** (via Prisma 7 and `@prisma/adapter-pg` connecting to Supabase) stores Marketplace products and orders.

The Social Platform Master Build Guide specifies a relational social platform with a follow graph, mutual follower calculations, bidirectional friendship/connection ranking, high-volume counter reconciliation, and feed pipelines. 

Section 3 of the guide mandates:
> "STOP CONDITION: if the existing database is not Postgres (e.g. SQLite/MongoDB) and holds production data, do not migrate silently. Write an ADR with options (keep it vs add Postgres for the social domain vs migrate with a tested plan) and default to Postgres for the social domain, because the social graph, feed queries, counters and full-text search are relational. Keep Better Auth's existing storage unless there's a compelling reason; auth users are referenced by id."

## Options Considered
1. **Store Social Domain in MongoDB**:
   - *Pros:* Single database for users and posts.
   - *Cons:* Severe relational bottlenecks for follower-of-follower queries, mutual connections ranking, transaction isolation for counter updates, and complex aggregation pipelines.
2. **Migrate Entire System (including Better Auth & User data) to PostgreSQL**:
   - *Pros:* Single database for everything.
   - *Cons:* High risk of data loss or service disruption for existing MongoDB production collections and active mobile users.
3. **Use PostgreSQL (via Prisma 7) for all Social Domain Entities, referencing User IDs** (Recommended):
   - *Pros:* Fully relational, index-backed social graph and feed queries; leverages existing configured Prisma/PostgreSQL infrastructure; zero disruption to production MongoDB user accounts.
   - *Cons:* Cross-database boundary between MongoDB User and PostgreSQL Post requires application-level joins or lightweight profile cache/author summaries.

## Decision
Place all Social Platform tables (`Post`, `Comment`, `Like`, `Repost`, `Bookmark`, `Follow`, `Highlight`, `Streak`, `SocialNotification`) in **PostgreSQL** managed by **Prisma 7**.
Reference user accounts by their string identifier (`userId String @db.Text`) without a cross-database foreign key constraint, following the existing pattern established in the `Order` model (`userId String // MongoDB user _id (no FK constraint)`). Embed author summary snapshots (`authorName`, `authorHandle`, `authorAvatar`, `authorTeam`) in post objects for fast, single-query feed responses.

## Consequences
- Fast, index-backed follow graph queries and cursor-based feed pagination.
- Full transactional safety for counter updates (`likeCount`, `repostCount`, `commentCount`).
- Preserves existing Better Auth and MongoDB production records untouched.
