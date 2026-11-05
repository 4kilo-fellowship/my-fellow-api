import dotenv from "dotenv";
dotenv.config({ path: "./.env" });
import mongoose from "mongoose";
import fs from "fs";
import path from "path";
import { uploadFileToCloudinary } from "../src/services/cloudinary.service.js";
import DevotionModel from "../src/models/devotion.model.js";

const DEVOTION_METADATA = [
  {
    key: "ersu_bemeta_ken",
    title: "እርሱ በመጣ ቀን",
    author: "Counseling Team",
    date: "2026-11-03",
    audioPath: "/home/nati/Downloads/Telegram Desktop/እርሱ በመጣ ቀን.m4a",
    duration: "03:38",
    readTime: "4 min read",
    caption:
      "ፀሐይ ወጥታለች ቤቱም እንደተለመደው በዕለት ተዕለት እንቅስቃሴዎች ተሞልቷል፤ ማርታም ልትወጣቸው የሚገቡ ብዙ ሥራዎች ነበሯት። ከዚያም ኢየሱስ እየመጣ መሆኑ ተሰማ...",
    image:
      "https://images.unsplash.com/photo-1507692049790-de58290a4334?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80",
    tags: ["ማርታና ማርያም", "መንፈሳዊ ዕረፍት", "የእግዚአብሔር ቃል", "Fellowship", "ጸሎት"],
    featured: true,
  },
  {
    key: "be_ersu_gize",
    title: "በእርሱ ጊዜ",
    author: "Counseling Team",
    date: "2026-10-25",
    audioPath: "/home/nati/Downloads/Telegram Desktop/በእርሱ ጊዜ.m4a",
    duration: "03:27",
    readTime: "4 min read",
    caption:
      "እግሮቼ እየደከሙ ነው፤ አጠገቤ ካሉት ሌሎች ሯጮች ተጨማሪ ብዙ የሮጥኩ ይመስል ላብ በላብ ሆኛለው። ወደ ፊት ስመለከት፣ ሁሉም ሰው ከእኔ በጣም ርቆ የሄደ ይመስላል...",
    image:
      "https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80",
    tags: ["ትዕግሥት", "የእግዚአብሔር ጊዜ", "የሕይወት ሩጫ", "እምነት", "ተስፋ"],
    featured: false,
  },
  {
    key: "wuloh_endet_new",
    title: "ውሎህ እንዴት ነው?",
    author: "Counseling Team",
    date: "2026-10-19",
    audioPath: "/home/nati/Downloads/Telegram Desktop/ውሎህ እንዴት ነው_.m4a",
    duration: "03:00",
    readTime: "3 min read",
    caption:
      "ክብደት ለመቀነስ በማሰብ gym መምጣት ከጀመርኩ አንድ አመት ሆኖኛል። 'ዛሬ ብቻ…' ይሄን አባባል ስንት ጊዜ እንደተጠቀምኩበት አላውቅም፤ እነዚህ ቃላት ብዙ ጊዜ ትልቅ ውድቀቶች የሚጀምሩባቸው ትንንሽ በሮች ናቸው...",
    image:
      "https://images.unsplash.com/photo-1499209974431-9dddcece7f88?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80",
    tags: ["የዕለት ልማድ", "መንፈሳዊ ጥንካሬ", "ራስን መግዛት", "ዕለታዊ ውሎ", "Fellowship"],
    featured: false,
  },
  {
    key: "yemehon_nidf",
    title: "የመሆን ንድፍ",
    author: "Counseling Team",
    date: "2026-10-10",
    audioPath: "/home/nati/Downloads/Telegram Desktop/የመሆን ንድፍ.m4a",
    duration: "03:23",
    readTime: "4 min read",
    caption:
      "ሰዎች በተፈጥሮአቸው ከሚኖሩበት ማህበራዊ አካባቢ ጋር ራሳቸውን ለማስማማት ራሳቸውም ሳያውቁት ይሞክራሉ። አንድ ሰው አብሮ ከሚውላቸው ሰዎች ጋር ቀስ በቀስ መመሳሰል ሲጀምር አስተውላችሁ ታውቃላችሁ?...",
    image:
      "https://images.unsplash.com/photo-1511632765486-a01980e01a18?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80",
    tags: ["ማንነት", "ማህበረሰብ", "መለወጥ", "ክርስቲያናዊ ሕይወት", "ጥበብ"],
    featured: false,
  },
];

async function seedDevotions() {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    console.error("MONGO_URI not found in environment.");
    process.exit(1);
  }

  console.log("Connecting to MongoDB...");
  await mongoose.connect(mongoUri);
  console.log("Connected to MongoDB successfully.");

  // Remove legacy book/pdf entries
  const deletedLegacy = await DevotionModel.deleteMany({
    type: { $in: ["book", "pdf"] },
  });
  console.log(`Cleaned up ${deletedLegacy.deletedCount} legacy book/pdf devotions.`);

  // Load scraped articles
  const jsonPath = path.resolve("./scripts/scraped_devotions.json");
  const scrapedData: { title: string; audioPath: string; content: string }[] =
    JSON.parse(fs.readFileSync(jsonPath, "utf-8"));

  const contentMap = new Map<string, string>();
  for (const item of scrapedData) {
    contentMap.set(item.title.trim(), item.content.trim());
  }

  for (const meta of DEVOTION_METADATA) {
    console.log(`\n==============================================`);
    console.log(`Processing Devotion: ${meta.title}`);

    const articleContent = contentMap.get(meta.title) || meta.caption;

    // Check if audio file exists
    let audioUrl: string | undefined;
    let audioPublicId: string | undefined;

    if (fs.existsSync(meta.audioPath)) {
      console.log(`Uploading audio for "${meta.title}" to Cloudinary...`);
      const fileBuffer = fs.readFileSync(meta.audioPath);
      const uploadRes = await uploadFileToCloudinary(fileBuffer, {
        folder: "devotions/audio",
        resource_type: "video",
      });
      audioUrl = uploadRes.secure_url;
      audioPublicId = uploadRes.public_id;
      console.log(`Audio uploaded! URL: ${audioUrl}`);
    } else {
      console.warn(`Audio file not found at: ${meta.audioPath}`);
    }

    // 1. Seed or update the Voice Devotion (Voice & Music with Caption)
    if (audioUrl) {
      const voiceTitle = meta.title;
      const existingVoice = await DevotionModel.findOne({
        title: voiceTitle,
        type: "voice",
      });

      if (existingVoice) {
        existingVoice.author = meta.author;
        existingVoice.date = meta.date;
        existingVoice.image = meta.image;
        existingVoice.audioUrl = audioUrl;
        existingVoice.audioPublicId = audioPublicId;
        existingVoice.duration = meta.duration;
        existingVoice.caption = meta.caption;
        existingVoice.content = articleContent;
        existingVoice.tags = meta.tags;
        existingVoice.featured = meta.featured;
        await existingVoice.save();
        console.log(`Updated existing Voice Devotion: "${voiceTitle}"`);
      } else {
        await DevotionModel.create({
          title: voiceTitle,
          author: meta.author,
          date: meta.date,
          type: "voice",
          views: Math.floor(180 + Math.random() * 300),
          likes: Math.floor(35 + Math.random() * 50),
          image: meta.image,
          duration: meta.duration,
          audioUrl,
          audioPublicId,
          caption: meta.caption,
          content: articleContent,
          tags: meta.tags,
          featured: meta.featured,
        });
        console.log(`Created Voice Devotion: "${voiceTitle}"`);
      }
    }

    // 2. Seed or update the Text Devotion (Articles only)
    const textTitle = `${meta.title} (ጽሑፍ)`;
    const existingText = await DevotionModel.findOne({
      title: textTitle,
      type: "text",
    });

    if (existingText) {
      existingText.author = meta.author;
      existingText.date = meta.date;
      existingText.image = meta.image;
      existingText.duration = meta.readTime;
      existingText.caption = meta.caption;
      existingText.content = articleContent;
      existingText.tags = meta.tags;
      existingText.featured = false;
      await existingText.save();
      console.log(`Updated existing Text Devotion: "${textTitle}"`);
    } else {
      await DevotionModel.create({
        title: textTitle,
        author: meta.author,
        date: meta.date,
        type: "text",
        views: Math.floor(220 + Math.random() * 400),
        likes: Math.floor(40 + Math.random() * 60),
        image: meta.image,
        duration: meta.readTime,
        caption: meta.caption,
        content: articleContent,
        tags: meta.tags,
        featured: false,
      });
      console.log(`Created Text Devotion: "${textTitle}"`);
    }
  }

  const totalDevotions = await DevotionModel.countDocuments();
  const voiceCount = await DevotionModel.countDocuments({ type: "voice" });
  const textCount = await DevotionModel.countDocuments({ type: "text" });

  console.log(`\n==============================================`);
  console.log(`Seeding complete!`);
  console.log(`Total Devotions in Database: ${totalDevotions}`);
  console.log(`Voice Devotions (with audio & captions): ${voiceCount}`);
  console.log(`Text Articles: ${textCount}`);

  await mongoose.disconnect();
  console.log("Disconnected from MongoDB.");
}

seedDevotions().catch((err) => {
  console.error("Seeding failed with error:", err);
  process.exit(1);
});
