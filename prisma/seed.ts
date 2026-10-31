import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const { Pool } = pg;
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Starting 4K Fellowship Social Seed...");

  // 1. Seed Ministries
  console.log("Creating ministries...");
  const worshipMinistry = await prisma.ministry.upsert({
    where: { slug: "worship-choir" },
    create: {
      slug: "worship-choir",
      name: "Worship & Choir",
      description:
        "Lifting up holy hands across 4 Kilo campus halls. Rehearsals every Wednesday & Friday at 5:30 PM. 🎸🎹🙌",
    },
    update: {},
  });

  const prayerMinistry = await prisma.ministry.upsert({
    where: { slug: "prayer-intercession" },
    create: {
      slug: "prayer-intercession",
      name: "Prayer & Intercession",
      description:
        "Standing in the gap for our campus, university, and nation. Morning prayer: 6:00 AM - 7:00 AM daily. 🔥🙏",
    },
    update: {},
  });

  const outreachMinistry = await prisma.ministry.upsert({
    where: { slug: "evangelism-outreach" },
    create: {
      slug: "evangelism-outreach",
      name: "Evangelism & Outreach",
      description:
        "Taking the Gospel of Christ to lecture halls, dorms, and campus grounds. 'Go and make disciples.' 🌱✝️",
    },
    update: {},
  });

  const bibleStudyMinistry = await prisma.ministry.upsert({
    where: { slug: "bible-study" },
    create: {
      slug: "bible-study",
      name: "Bible Study & Discipleship",
      description:
        "Weekly dorm cell groups and verse-by-verse scripture deep-dives in God's Word. 📖✨",
    },
    update: {},
  });

  const mediaMinistry = await prisma.ministry.upsert({
    where: { slug: "media-tech" },
    create: {
      slug: "media-tech",
      name: "Media & Technical",
      description:
        "Sound engineering, livestreaming, visual design, and social media production for the glory of God. 🎥💻",
    },
    update: {},
  });

  // 2. Seed Users & Profiles
  console.log("Creating members & profiles...");

  const membersData = [
    {
      userId: "user-abenezer",
      username: "abenezer_worship",
      displayName: "Abenezer Bekele",
      bio: "Worship leader at 4 Kilo ECSF. Passionate about Jesus, acoustic worship, and code. 🎸💻",
      location: "4 Kilo Fellowship Hall",
      department: "Software Engineering",
      studyYear: 4,
      fellowshipRole: "Worship Leader",
      isVerified: true,
      followersCount: 480,
      followingCount: 210,
      postsCount: 16,
      avatarUrl:
        "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80",
      bannerUrl:
        "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=1200&q=80",
      streak: 32,
      ministryId: worshipMinistry.id,
      ministryRole: "Worship Leader",
    },
    {
      userId: "user-hiwot",
      username: "hiwot_t",
      displayName: "Hiwot Tadesse",
      bio: "Intercessor • Seeking God's presence in 4 Kilo • Architecture '27 📐🙏",
      location: "Campus Prayer Hall",
      department: "Architecture",
      studyYear: 3,
      fellowshipRole: "Prayer Coordinator",
      isVerified: true,
      followersCount: 342,
      followingCount: 185,
      postsCount: 12,
      avatarUrl:
        "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80",
      bannerUrl:
        "https://images.unsplash.com/photo-1507692049790-de58290a4334?auto=format&fit=crop&w=1200&q=80",
      streak: 14,
      ministryId: prayerMinistry.id,
      ministryRole: "Prayer Coordinator",
    },
    {
      userId: "user-yohannes",
      username: "yohannes_h",
      displayName: "Yohannes Hailu",
      bio: "Colossians 2:7 • Final year EE • Growing together in the Word of Truth 📖⚡",
      location: "Block 48, AAU",
      department: "Electrical Engineering",
      studyYear: 5,
      fellowshipRole: "Bible Study Leader",
      isVerified: true,
      followersCount: 290,
      followingCount: 140,
      postsCount: 8,
      avatarUrl:
        "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80",
      bannerUrl:
        "https://images.unsplash.com/photo-1519817650390-64a93db51149?auto=format&fit=crop&w=1200&q=80",
      streak: 21,
      ministryId: bibleStudyMinistry.id,
      ministryRole: "Cell Group Leader",
    },
    {
      userId: "user-bethelhem",
      username: "bethelhem_a",
      displayName: "Bethelhem Assefa",
      bio: "Healer in training • Sharing the everlasting love of Jesus on campus & hospital wards 🩺✝️",
      location: "Tikur Anbessa Hospital",
      department: "Medicine",
      studyYear: 4,
      fellowshipRole: "Outreach Coordinator",
      isVerified: true,
      followersCount: 415,
      followingCount: 198,
      postsCount: 19,
      avatarUrl:
        "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=400&q=80",
      bannerUrl:
        "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=1200&q=80",
      streak: 45,
      ministryId: outreachMinistry.id,
      ministryRole: "Outreach Coordinator",
    },
    {
      userId: "user-natnael",
      username: "natnael_t",
      displayName: "Natnael Tamiru",
      bio: "Media & Sound • Visual storytelling for Christ • CS sophomore 🎥💻",
      location: "Sound Booth, Main Hall",
      department: "Computer Science",
      studyYear: 2,
      fellowshipRole: "Media Team Lead",
      isVerified: true,
      followersCount: 215,
      followingCount: 110,
      postsCount: 7,
      avatarUrl:
        "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80",
      bannerUrl:
        "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=1200&q=80",
      streak: 19,
      ministryId: mediaMinistry.id,
      ministryRole: "Technical Director",
    },
    {
      userId: "user-fellowship",
      username: "4kilo_fellowship",
      displayName: "4 Kilo Fellowship",
      bio: "Official digital home of Addis Ababa University 4 Kilo Christian Students Fellowship. 'Rooted & Built Up in Him.' Col 2:7 ✝️",
      location: "Addis Ababa University 4 Kilo Campus",
      department: "Campus Ministry Leadership",
      studyYear: 4,
      fellowshipRole: "Executive Ministry",
      isVerified: true,
      followersCount: 1240,
      followingCount: 38,
      postsCount: 56,
      avatarUrl:
        "https://images.unsplash.com/photo-1541829070764-84a7d30dd3f3?auto=format&fit=crop&w=400&q=80",
      bannerUrl:
        "https://images.unsplash.com/photo-1541829070764-84a7d30dd3f3?auto=format&fit=crop&w=1200&q=80",
      streak: 142,
      ministryId: worshipMinistry.id,
      ministryRole: "Executive Ministry",
    },
  ];

  for (const m of membersData) {
    // Media Asset for avatar
    const avatar = await prisma.mediaAsset.create({
      data: {
        ownerId: m.userId,
        purpose: "avatar",
        status: "ready",
        storageKey: m.avatarUrl,
        mime: "image/jpeg",
        width: 400,
        height: 400,
        variants: { sm: m.avatarUrl, md: m.avatarUrl, lg: m.avatarUrl },
      },
    });

    const cover = await prisma.mediaAsset.create({
      data: {
        ownerId: m.userId,
        purpose: "cover",
        status: "ready",
        storageKey: m.bannerUrl,
        mime: "image/jpeg",
        width: 1200,
        height: 400,
        variants: { sm: m.bannerUrl, md: m.bannerUrl, lg: m.bannerUrl },
      },
    });

    await prisma.profile.upsert({
      where: { userId: m.userId },
      create: {
        userId: m.userId,
        username: m.username,
        displayName: m.displayName,
        bio: m.bio,
        location: m.location,
        department: m.department,
        studyYear: m.studyYear,
        fellowshipRole: m.fellowshipRole,
        isVerified: m.isVerified,
        followersCount: m.followersCount,
        followingCount: m.followingCount,
        postsCount: m.postsCount,
        avatarAssetId: avatar.id,
        coverAssetId: cover.id,
        lastSeenAt: new Date(),
      },
      update: {
        avatarAssetId: avatar.id,
        coverAssetId: cover.id,
      },
    });

    // Profile Link
    await prisma.profileLink.createMany({
      data: [
        {
          userId: m.userId,
          kind: "telegram",
          handle: `@${m.username}`,
          url: `https://t.me/${m.username}`,
          position: 0,
        },
      ],
      skipDuplicates: true,
    });

    // Ministry Membership
    await prisma.ministryMember.upsert({
      where: {
        ministryId_userId: {
          ministryId: m.ministryId,
          userId: m.userId,
        },
      },
      create: {
        ministryId: m.ministryId,
        userId: m.userId,
        role: m.ministryRole,
        status: "active",
      },
      update: {},
    });

    // Streak
    const today = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Africa/Addis_Ababa",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());

    await prisma.userStreak.upsert({
      where: { userId: m.userId },
      create: {
        userId: m.userId,
        current: m.streak,
        longest: m.streak,
        lastLocalDate: today,
      },
      update: {
        current: m.streak,
        longest: m.streak,
        lastLocalDate: today,
      },
    });

    await prisma.streakDay.upsert({
      where: { userId_localDate: { userId: m.userId, localDate: today } },
      create: { userId: m.userId, localDate: today },
      update: {},
    });
  }

  // 3. Seed Story Highlights for Abenezer
  console.log("Creating story highlights...");
  const highlightTitles = [
    { title: "Sunday", emoji: "⛪" },
    { title: "Worship", emoji: "🎸" },
    { title: "Camp '25", emoji: "⛺" },
    { title: "Outreach", emoji: "🌱" },
    { title: "Testimony", emoji: "✨" },
  ];

  for (let i = 0; i < highlightTitles.length; i++) {
    const ht = highlightTitles[i];
    await prisma.highlight.create({
      data: {
        ownerId: "user-abenezer",
        title: ht.title,
        emoji: ht.emoji,
        position: i,
      },
    });
  }

  // 4. Seed Follow Relationships (creating mutuals for recommendation algorithms)
  console.log("Creating follow graph...");
  const followPairs = [
    ["user-abenezer", "user-hiwot"],
    ["user-hiwot", "user-abenezer"],
    ["user-abenezer", "user-bethelhem"],
    ["user-bethelhem", "user-abenezer"],
    ["user-abenezer", "user-yohannes"],
    ["user-yohannes", "user-abenezer"],
    ["user-hiwot", "user-bethelhem"],
    ["user-bethelhem", "user-hiwot"],
    ["user-yohannes", "user-natnael"],
    ["user-natnael", "user-abenezer"],
    ["user-fellowship", "user-abenezer"],
  ];

  for (const [f1, f2] of followPairs) {
    await prisma.follow.upsert({
      where: { followerId_followeeId: { followerId: f1, followeeId: f2 } },
      create: { followerId: f1, followeeId: f2, status: "accepted" },
      update: {},
    });
  }

  // 5. Seed Content Videos
  console.log("Creating video library...");
  const videosData = [
    {
      title: "Sunday Service Highlights — The Unshakable Kingdom",
      description:
        "A powerful recap of Sunday worship, scripture meditation, and practical spiritual guidance for campus life.",
      durationSeconds: 604,
      thumbnailUrl:
        "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=800&q=80",
      playbackUrl:
        "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
      publishedAt: new Date(Date.now() - 2 * 86400000),
    },
    {
      title: "Live Acoustic Worship Night — 4 Kilo Fellowship",
      description:
        "Intimate acoustic worship moments and intercession with the fellowship choir.",
      durationSeconds: 653,
      thumbnailUrl:
        "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=800&q=80",
      playbackUrl:
        "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
      publishedAt: new Date(Date.now() - 5 * 86400000),
    },
    {
      title: "Freshman Orientation & Campus Walk of Faith",
      description:
        "Encouragement, university tips, and elder student testimonies for new 4 Kilo campus students.",
      durationSeconds: 900,
      thumbnailUrl:
        "https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=800&q=80",
      playbackUrl:
        "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
      publishedAt: new Date(Date.now() - 7 * 86400000),
    },
    {
      title: "Midweek Bible Study: Colossians Chapter 2",
      description:
        "Deep exploration into our theme verse: rooted, built up, and established in the faith.",
      durationSeconds: 1240,
      thumbnailUrl:
        "https://images.unsplash.com/photo-1507692049790-de58290a4334?auto=format&fit=crop&w=800&q=80",
      playbackUrl:
        "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
      publishedAt: new Date(Date.now() - 9 * 86400000),
    },
  ];

  for (const v of videosData) {
    await prisma.contentItem.create({
      data: {
        kind: "video",
        title: v.title,
        description: v.description,
        durationSeconds: v.durationSeconds,
        thumbnailUrl: v.thumbnailUrl,
        playbackUrl: v.playbackUrl,
        publishedAt: v.publishedAt,
      },
    });
  }

  // 6. Seed Reflections (Posts)
  console.log("Creating reflections and posts...");
  const reflections = [
    {
      authorId: "user-fellowship",
      body: "Welcome to the new 4 Kilo Fellowship digital platform! ✨\n\nTrack your daily devotions streak, connect with fellowship ministry teams, listen to acoustic worship sessions, and stay deeply rooted in Christ across campus. 'Let us hold fast the confession of our hope without wavering.' #4KiloECSF #CampusRevival",
      likeCount: 342,
      repostCount: 84,
      replyCount: 3,
    },
    {
      authorId: "user-abenezer",
      body: "Rehearsals for Friday's Worship Night are underway! Psalm 100: 'Enter his gates with thanksgiving, and his courts with praise!' Come ready for an intimate encounter with God. 🎸🙌 #WorshipNight #4KiloECSF",
      likeCount: 156,
      repostCount: 22,
      replyCount: 2,
    },
    {
      authorId: "user-hiwot",
      body: "Morning prayer in the hall this morning was filled with the tangible presence of God. Praying for all engineering and science students starting midterms this week! You are more than conquerors through Christ! 🙏⚡ #PrayerWarriors #FaithAtAAU",
      likeCount: 189,
      repostCount: 31,
      replyCount: 1,
    },
  ];

  for (const r of reflections) {
    const post = await prisma.post.create({
      data: {
        authorId: r.authorId,
        body: r.body,
        likeCount: r.likeCount,
        repostCount: r.repostCount,
        replyCount: r.replyCount,
      },
    });

    // Hashtags
    const matches = r.body.match(/#([a-zA-Z0-9_]+)/g);
    if (matches) {
      for (const m of matches) {
        const tag = m.slice(1).toLowerCase();
        const ht = await prisma.hashtag.upsert({
          where: { tag },
          create: { tag },
          update: {},
        });
        await prisma.postHashtag.create({
          data: { postId: post.id, hashtagId: ht.id },
        });
      }
    }
  }

  console.log("✅ Seed completed successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
