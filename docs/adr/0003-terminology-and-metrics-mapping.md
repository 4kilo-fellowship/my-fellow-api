# ADR 0003: Social Terminology & Metrics Mapping

## Status
Accepted

## Context
The 4 Kilo Fellowship mobile app UI uses domain-specific fellowship terminology:
- Feed entries are displayed as **"Reflections"**.
- User profile followers and community members are labeled **"Connects"**.
- Shared connections on recommendation cards are presented as **"N mutual peers"**.
- User posts can be regular posts, quote reflections, or replies.

## Decision
1. **Domain Model & Database Schema**: Use standard industry conventions in the database and API contracts:
   - Entity: `Post` with `kind` (`POST | QUOTE | REPLY`).
   - Graph: `Follow` table with `followerId` and `followingId`.
2. **Metrics & Terminology Mapping**:
   - UI "Reflections" = `Post` records where `kind IN ('POST', 'QUOTE')`.
   - UI "Connects" count = `followersCount` (the number of fellow students following the user).
   - UI "Mutual peers" = Count of mutual follow intersections: `COUNT(following_of_viewer INTERSECT followers_of_candidate)`.
3. **API & Contracts**: API contracts will return generic properties (`postsCount`, `followersCount`, `followingCount`, `mutualPeersCount`) while the mobile presentation layer translates them into fellowship labels ("Reflections", "Connects", "mutual peers").

## Consequences
- Clean separation between standard backend data models and campus fellowship UI presentation.
- Easy adaptability if fellowship marketing terminology evolves in the future.
- Straightforward, standard SQL schema and index definitions.
