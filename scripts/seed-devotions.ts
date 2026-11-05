import dotenv from "dotenv";
dotenv.config({ path: "./.env" });
import mongoose from "mongoose";
import fs from "fs";
import path from "path";
import DevotionModel from "../src/models/devotion.model.js";
import { UserModel } from "../src/models/user.model.js";

async function seed() {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    console.error("MONGO_URI not found in environment.");
    process.exit(1);
  }

  console.log("Connecting to MongoDB...");
  await mongoose.connect(mongoUri);
  console.log("Connected to MongoDB successfully.");

  // 1. Ensure Official "4 Kilo Fellowship" Admin Account exists
  console.log("\nEnsuring official 4 Kilo Fellowship user account...");
  const officialUser = await UserModel.findOneAndUpdate(
    { phoneNumber: "0900004000" },
    {
      $set: {
        fullName: "4 Kilo Fellowship",
        phoneNumber: "0900004000",
        role: "admin",
        department: "Campus Ministry & Counseling",
        telegramUserName: "aau4kilofellowship",
        profileImage:
          "https://images.unsplash.com/photo-1544427920-c49ccfb85579?auto=format&fit=crop&w=400&q=80",
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
  console.log("Official Fellowship User ID:", officialUser._id.toString());

  // 2. Ensure Admin "Nati" has complete profile info
  console.log("Updating admin Nati profile...");
  const adminNati = await UserModel.findOneAndUpdate(
    { phoneNumber: "0994627985" },
    {
      $set: {
        fullName: "Natnael Tamiru",
        role: "admin",
        department: "Software Engineering & Media Team",
        telegramUserName: "nati",
        profileImage:
          "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80",
      },
    },
    { new: true },
  );
  const natiId = adminNati ? adminNati._id.toString() : officialUser._id.toString();

  // 3. Load scraped Telegraph articles
  const jsonPath = path.resolve("./scripts/scraped_devotions.json");
  const scrapedData: { title: string; content: string }[] = JSON.parse(
    fs.readFileSync(jsonPath, "utf-8"),
  );
  const contentMap = new Map<string, string>();
  for (const item of scrapedData) {
    contentMap.set(item.title.trim(), item.content.trim());
  }

  // 4. Define all 14 devotions with 100% UNIQUE images and complete data
  const devotionsToSeed = [
    // ─── 1. እርሱ በመጣ ቀን (Voice Devotion) ──────────────────────────
    {
      title: "እርሱ በመጣ ቀን",
      type: "voice" as const,
      author: "Counseling Team",
      authorId: officialUser._id,
      authorAvatar: officialUser.profileImage,
      authorRole: "Counseling Department • 4 Kilo Fellowship",
      authorUsername: "aau4kilofellowship",
      date: "2026-11-03",
      duration: "03:38",
      audioUrl:
        "https://res.cloudinary.com/doi9bg69o/video/upload/v1793867256/devotions/audio/qp29zpnogtcnida23yp8.m4a",
      audioPublicId: "devotions/audio/qp29zpnogtcnida23yp8",
      image:
        "https://images.unsplash.com/photo-1507692049790-de58290a4334?auto=format&fit=crop&w=1200&q=80",
      caption:
        "ፀሐይ ወጥታለች ቤቱም እንደተለመደው በዕለት ተዕለት እንቅስቃሴዎች ተሞልቷል፤ ማርታም ልትወጣቸው የሚገቡ ብዙ ሥራዎች ነበሯት። ከዚያም ኢየሱስ እየመጣ መሆኑ ተሰማ...",
      content: contentMap.get("እርሱ በመጣ ቀን") || "",
      tags: ["ማርታና ማርያም", "መንፈሳዊ ዕረፍት", "የእግዚአብሔር ቃል", "Fellowship", "ጸሎት"],
      featured: true,
      views: 1420,
      likes: 385,
    },

    // ─── 2. እርሱ በመጣ ቀን — በማርታና በማርያም ቤት (Text Devotion) ──────
    {
      title: "እርሱ በመጣ ቀን — በማርታና በማርያም ቤት",
      type: "text" as const,
      author: "Counseling Team",
      authorId: officialUser._id,
      authorAvatar: officialUser.profileImage,
      authorRole: "Counseling Department • 4 Kilo Fellowship",
      authorUsername: "aau4kilofellowship",
      date: "2026-11-03",
      duration: "4 min read",
      image:
        "https://images.unsplash.com/photo-1490730141103-6cac27aaab94?auto=format&fit=crop&w=1200&q=80",
      caption:
        "ማርታ ለኢየሱስ ልታደርግ በምትችለው ነገር ላይ ትኩረቷን አድርጋ ነበር፤ ማርያም ግን ከእርሱ ጋር በመሆን ላይ...",
      content: contentMap.get("እርሱ በመጣ ቀን") || "",
      tags: ["ማርታና ማርያም", "መንፈሳዊ ዕረፍት", "አገልግሎት", "ጥሞና", "ምርጫ"],
      featured: false,
      views: 890,
      likes: 240,
    },

    // ─── 3. በእርሱ ጊዜ (Voice Devotion) ───────────────────────────
    {
      title: "በእርሱ ጊዜ",
      type: "voice" as const,
      author: "Counseling Team",
      authorId: officialUser._id,
      authorAvatar: officialUser.profileImage,
      authorRole: "Counseling Department • 4 Kilo Fellowship",
      authorUsername: "aau4kilofellowship",
      date: "2026-10-25",
      duration: "03:27",
      audioUrl:
        "https://res.cloudinary.com/doi9bg69o/video/upload/v1793852674/devotions/audio/wdyjphbxa7rcxh3mcpvu.m4a",
      audioPublicId: "devotions/audio/wdyjphbxa7rcxh3mcpvu",
      image:
        "https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?auto=format&fit=crop&w=1200&q=80",
      caption:
        "እግሮቼ እየደከሙ ነው፤ አጠገቤ ካሉት ሌሎች ሯጮች ተጨማሪ ብዙ የሮጥኩ ይመስል ላብ በላብ ሆኛለው። ወደ ፊት ስመለከት፣ ሁሉም ሰው ከእኔ በጣም ርቆ የሄደ ይመስላል...",
      content: contentMap.get("በእርሱ ጊዜ") || "",
      tags: ["ትዕግሥት", "የእግዚአብሔር ጊዜ", "የሕይወት ሩጫ", "እምነት", "ተስፋ"],
      featured: true,
      views: 1180,
      likes: 312,
    },

    // ─── 4. በእርሱ ጊዜ — የሕይወት ሩጫና ትዕግሥት (Text Devotion) ───────
    {
      title: "በእርሱ ጊዜ — የሕይወት ሩጫና ትዕግሥት",
      type: "text" as const,
      author: "Counseling Team",
      authorId: officialUser._id,
      authorAvatar: officialUser.profileImage,
      authorRole: "Counseling Department • 4 Kilo Fellowship",
      authorUsername: "aau4kilofellowship",
      date: "2026-10-25",
      duration: "4 min read",
      image:
        "https://images.unsplash.com/photo-1470240731273-7821a6eeb6bd?auto=format&fit=crop&w=1200&q=80",
      caption:
        "ዋናው ቁምነገር ሌሎችን ሁሉ ቀድሞ መሮጥ አይደለም፤ ዋናው ነገር ዓይኖቼን በክርስቶስ ላይ ብቻ በማድረግ በታማኝነት መሮጥ ነው።",
      content: contentMap.get("በእርሱ ጊዜ") || "",
      tags: ["ፊልጵስዩስ 1:6", "የሕይወት ጉዞ", "ትዕግሥት", "እምነት"],
      featured: false,
      views: 740,
      likes: 198,
    },

    // ─── 5. ውሎህ እንዴት ነው? (Voice Devotion) ──────────────────────
    {
      title: "ውሎህ እንዴት ነው?",
      type: "voice" as const,
      author: "Counseling Team",
      authorId: officialUser._id,
      authorAvatar: officialUser.profileImage,
      authorRole: "Counseling Department • 4 Kilo Fellowship",
      authorUsername: "aau4kilofellowship",
      date: "2026-10-19",
      duration: "03:00",
      audioUrl:
        "https://res.cloudinary.com/doi9bg69o/video/upload/v1793852680/devotions/audio/tyhuzktnrc9dwsjg3g7b.m4a",
      audioPublicId: "devotions/audio/tyhuzktnrc9dwsjg3g7b",
      image:
        "https://images.unsplash.com/photo-1499209974431-9dddcece7f88?auto=format&fit=crop&w=1200&q=80",
      caption:
        "ክብደት ለመቀነስ በማሰብ gym መምጣት ከጀመርኩ አንድ አመት ሆኖኛል... 'ዛሬ ብቻ…' ይሄን አባባል ስንት ጊዜ እንደተጠቀምኩበት አላውቅም፤ እነዚህ ቃላት ትልልቅ ውድቀቶች የሚጀምሩባቸው ትንንሽ በሮች ናቸው...",
      content: contentMap.get("ውሎህ እንዴት ነው?") || "",
      tags: ["የዕለት ልማድ", "መንፈሳዊ ጥንካሬ", "ራስን መግዛት", "ዕለታዊ ውሎ", "Fellowship"],
      featured: false,
      views: 950,
      likes: 276,
    },

    // ─── 6. ውሎህ እንዴት ነው? — ዕለታዊ ልማድና መንፈሳዊ ማንነት (Text) ─
    {
      title: "ውሎህ እንዴት ነው? — ዕለታዊ ልማድና መንፈሳዊ ማንነት",
      type: "text" as const,
      author: "Counseling Team",
      authorId: officialUser._id,
      authorAvatar: officialUser.profileImage,
      authorRole: "Counseling Department • 4 Kilo Fellowship",
      authorUsername: "aau4kilofellowship",
      date: "2026-10-19",
      duration: "3 min read",
      image:
        "https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?auto=format&fit=crop&w=1200&q=80",
      caption:
        "በየቀኑ የምንሰማው፣ የምናየው፣ የምናስበው እና በልባችን ቦታ የምንሰጠው ነገር ቀስ በቀስ ማን እንደምንሆን ይቀርፀናል።",
      content: contentMap.get("ውሎህ እንዴት ነው?") || "",
      tags: ["ዕለታዊ ልማድ", "የልብ ጥበቃ", "መንፈሳዊ ጥንካሬ", "ጥበብ"],
      featured: false,
      views: 680,
      likes: 185,
    },

    // ─── 7. የመሆን ንድፍ (Voice Devotion) ─────────────────────────
    {
      title: "የመሆን ንድፍ",
      type: "voice" as const,
      author: "Counseling Team",
      authorId: officialUser._id,
      authorAvatar: officialUser.profileImage,
      authorRole: "Counseling Department • 4 Kilo Fellowship",
      authorUsername: "aau4kilofellowship",
      date: "2026-10-10",
      duration: "03:45",
      audioUrl:
        "https://res.cloudinary.com/doi9bg69o/video/upload/v1793852685/devotions/audio/j7uqzbwuyhq5wnp8afr2.m4a",
      audioPublicId: "devotions/audio/j7uqzbwuyhq5wnp8afr2",
      image:
        "https://images.unsplash.com/photo-1511632765486-a01980e01a18?auto=format&fit=crop&w=1200&q=80",
      caption:
        "ሰዎች በተፈጥሮአቸው ከሚኖሩበት ማህበራዊ አካባቢ ጋር ራሳቸውን ለማስማማት ራሳቸውም ሳያውቁት ይሞክራሉ። አንድ ሰው አብሮ ከሚውላቸው ሰዎች ጋር ቀስ በቀስ መመሳሰል ሲጀምር አስተውላችሁ ታውቃላችሁ?...",
      content: contentMap.get("የመሆን ንድፍ") || "",
      tags: ["ማንነት", "ማህበረሰብ", "መለወጥ", "ክርስቲያናዊ ሕይወት", "ጥበብ"],
      featured: false,
      views: 1240,
      likes: 340,
    },

    // ─── 8. የመሆን ንድፍ — ይህን ዓለም አትምሰሉ (Text Devotion) ───────
    {
      title: "የመሆን ንድፍ — ይህን ዓለም አትምሰሉ",
      type: "text" as const,
      author: "Counseling Team",
      authorId: officialUser._id,
      authorAvatar: officialUser.profileImage,
      authorRole: "Counseling Department • 4 Kilo Fellowship",
      authorUsername: "aau4kilofellowship",
      date: "2026-10-10",
      duration: "4 min read",
      image:
        "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1200&q=80",
      caption:
        "ከሌሎች ሰዎች ጋር ለመመሳሰል ከመሞከር ይልቅ፣ እንደ ክርስቶስ ለመኖር መሞከር አለብን። ንድፋችን ክርስቶስ ነው።",
      content: contentMap.get("የመሆን ንድፍ") || "",
      tags: ["ሮሜ 12:2", "ማንነት", "ክርስቶስን መምሰል", "የልብ መታደስ"],
      featured: false,
      views: 820,
      likes: 215,
    },

    // ─── 9. በድካም ውስጥ ስናልፍ (Voice Devotion) ───────────────────
    {
      title: "በድካም ውስጥ ስናልፍ",
      type: "voice" as const,
      author: "I4U Team",
      authorId: officialUser._id,
      authorAvatar: officialUser.profileImage,
      authorRole: "I4U Intercession • 4 Kilo Fellowship",
      authorUsername: "aau4kilofellowship",
      date: "2026-09-28",
      duration: "04:12",
      audioUrl:
        "https://res.cloudinary.com/doi9bg69o/video/upload/v1775813620/devotions/audio/ihqfvipsza9ua1vs6kr7.mp3",
      image:
        "https://images.unsplash.com/photo-1519834785169-98be25ec3f84?auto=format&fit=crop&w=1200&q=80",
      caption:
        "ድካም ሲሰማንና መንገዱ ሲረዝም ኃይልን የሚያድሰው የጌታ መገኘት ከእኛ ጋር ነው።",
      content:
        "በመንፈሳዊ ጉዟችን ውስጥ ድካም የሚሰማንና ተስፋ የመቁረጥ ስሜት የሚከበንባቸው ወቅቶች ሊኖሩ ይችላሉ። ነገር ግን ሐዋርያው ጳውሎስ 'ስደክም ያን ጊዜ ኃይለኛ ነኝና' እንዳለው የእግዚአብሔር ፀጋ በድካማችን ውስጥ ይገለጻል። ጸሎት ወደዚህ እረፍት መግቢያ በር ነው። ዛሬ ሸክምህን ለእርሱ ስጥ፤ እርሱም ያሳርፍሃል።",
      tags: ["ጸሎት", "እረፍት", "የእግዚአብሔር ፀጋ", "ጥንካሬ"],
      featured: false,
      views: 650,
      likes: 190,
    },

    // ─── 10. እኔ በሚገባኝ ቦታ ነኝ? (Voice Devotion) ─────────────────
    {
      title: "እኔ በሚገባኝ ቦታ ነኝ?",
      type: "voice" as const,
      author: "Evange Team",
      authorId: officialUser._id,
      authorAvatar: officialUser.profileImage,
      authorRole: "Evangelism Department • 4 Kilo Fellowship",
      authorUsername: "aau4kilofellowship",
      date: "2026-09-18",
      duration: "03:50",
      audioUrl:
        "https://res.cloudinary.com/doi9bg69o/video/upload/v1775814822/devotions/audio/fd5es4io5bquxl0hpldm.m4a",
      image:
        "https://images.unsplash.com/photo-1509021436665-8f07dbf5bf1d?auto=format&fit=crop&w=1200&q=80",
      caption:
        "ሕይወት ብዙ ምርጫዎች አሏት፤ እግዚአብሔር ግን እያንዳንዳችንን ለዓላማ አስቀምጦናል።",
      content:
        "ብዙ ጊዜ ራሳችንን ከሌሎች ጋር በማነጻጸር 'እኔ ያለሁበት ቦታ ትክክል ነው?' ብለን እንጠይቃለን። ነገር ግን ጌታ እያንዳንዳችንን በካምፓስ፣ በቡድን፣ እና በክፍላችን ያስቀመጠን እርሱ ሊሰራበት በወደደው ምክንያት ነው። እርምጃህን በቃሉ ምራ፤ እርሱም የቀና መንገድ ያደርግልሃል።",
      tags: ["ዓላማ", "የሕይወት ጥሪ", "መመራት", "እምነት"],
      featured: false,
      views: 590,
      likes: 165,
    },

    // ─── 11. ምስጋናዬ የሚገባህ (Voice Devotion) ───────────────────
    {
      title: "ምስጋናዬ የሚገባህ",
      type: "voice" as const,
      author: "Evange Team",
      authorId: officialUser._id,
      authorAvatar: officialUser.profileImage,
      authorRole: "Evangelism Department • 4 Kilo Fellowship",
      authorUsername: "aau4kilofellowship",
      date: "2026-09-10",
      duration: "05:15",
      audioUrl:
        "https://res.cloudinary.com/doi9bg69o/video/upload/v1775815128/devotions/audio/o7c3w9dwacexpu4ixec7.ogg",
      image:
        "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1200&q=80",
      caption:
        "ሁሉ በአመስጋኝነት ልብ ሲከናወን በሕይወታችን የሰማይ ሰላም ይነግሣል።",
      content:
        "ዳዊት በመዝሙር 103 'ነፍሴ ሆይ እግዚአብሔርን ባርኪ፥ ምስጋናውንም ሁሉ አትርሺ' እንዳለው አምላካችን በዕለት ተዕለት ውለታው ሁልጊዜ የተመሰገነ ነው። በፈተናም ሆነ በድል ውስጥ ምስጋና በልባችን ሲሞላ መንፈሳችን ይበረታል።",
      tags: ["ምስጋና", "አምልኮ", "የልብ ሰላም", "መዝሙር 103"],
      featured: false,
      views: 710,
      likes: 220,
    },

    // ─── 12. የጠዋት ጸሎትና ፀጋ (Text Devotion by Admin Nati) ────────
    {
      title: "የጠዋት ጸሎትና ፀጋ — የማለዳ ኅብረት",
      type: "text" as const,
      author: "Natnael Tamiru",
      authorId: natiId,
      authorAvatar:
        "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80",
      authorRole: "Fellowship Leader & Admin",
      authorUsername: "nati",
      date: "2026-11-04",
      duration: "3 min read",
      image:
        "https://images.unsplash.com/photo-1504052434569-70ad5836ab65?auto=format&fit=crop&w=1200&q=80",
      caption:
        "ማለዳ ከእግዚአብሔር ቃልና ከጸሎት ጋር መጀመር የቀናችንን ሙሉ አቅጣጫና ሰላም ይወስናል።",
      content:
        "ጠዋት ማለዳ ፀሐይ ከመውጣቷ በፊት ከእግዚአብሔር ጋር የሚደረግ ኅብረት የቀኑን ሙሉ አቅጣጫ ይወስናል። ጌታችን ኢየሱስ በማለዳ ተነስቶ ወደ ምድረ በዳ ሄዶ ይጸልይ ነበር። የእኛም መንፈሳዊ ጥንካሬ የሚመነጨው ከዚህ የጸጥታ ጊዜ ነው። በዩኒቨርሲቲ ውጥረትና በፈተናዎች መሀል ቀንህን በጸሎት ጀምር፤ ጌታም መንፈስህን ያድሳል።\n\n“እግዚአብሔር ሆይ፥ በማለዳ ድምፄን ትሰማለህ፤ በማለዳ በፊትህ እቆማለሁ፥ እጠብቅማለሁ።” — መዝሙር 5:3",
      tags: ["ማለዳ", "ጸሎት", "የእግዚአብሔር ቃል", "ካምፓስ"],
      featured: false,
      views: 450,
      likes: 130,
    },

    // ─── 13. በፈተና ውስጥ ያለ ደስታ (Text Devotion) ────────────────
    {
      title: "በፈተና ውስጥ ያለ ደስታ — ያዕቆብ 1:2",
      type: "text" as const,
      author: "Counseling Team",
      authorId: officialUser._id,
      authorAvatar: officialUser.profileImage,
      authorRole: "Counseling Department • 4 Kilo Fellowship",
      authorUsername: "aau4kilofellowship",
      date: "2026-10-05",
      duration: "4 min read",
      image:
        "https://images.unsplash.com/photo-1518495973542-4542c06a5843?auto=format&fit=crop&w=1200&q=80",
      caption:
        "ፈተናዎች እምነታችንን የሚያጠሩና ትዕግሥትን በሕይወታችን የሚሰሩ ታላላቅ በረከቶች ናቸው።",
      content:
        "ያዕቆብ በመልእክቱ 'ወንድሞቼ ሆይ፥ የእምነታችሁ መፈተን ትዕግሥትን እንዲያደርግላችሁ አውቃችሁ፥ ልዩ ልዩ ፈተና ሲደርስባችሁ እንደ ሙሉ ደስታ ቁጠሩት' ይለናል። በዩኒቨርሲቲ ህይወታችን ውስጥ የሚያጋጥሙን ፈተናዎች ማንነታችንን የሚቀርጹና ወደ ክርስቶስ ሙላት የሚያደርሱን የእድገት መንገዶች ናቸው። ተስፋ ሳንቆርጥ ወደ እርሱ እንመልከት።",
      tags: ["ያዕቆብ 1", "ትዕግሥት", "ደስታ", "የእምነት ፈተና"],
      featured: false,
      views: 520,
      likes: 145,
    },

    // ─── 14. የእረኛው ድምፅ (Text Devotion) ────────────────────────
    {
      title: "የእረኛው ድምፅ — ዮሐንስ 10:27",
      type: "text" as const,
      author: "4 Kilo Fellowship",
      authorId: officialUser._id,
      authorAvatar: officialUser.profileImage,
      authorRole: "Campus Ministry Leadership",
      authorUsername: "aau4kilofellowship",
      date: "2026-09-30",
      duration: "3 min read",
      image:
        "https://images.unsplash.com/photo-1472214103451-9374bd1c798e?auto=format&fit=crop&w=1200&q=80",
      caption:
        "በዓለም ጫጫታ መካከል የመልካሙን እረኛ የኢየሱስን ድምፅ በጥሞና እናዳምጥ።",
      content:
        "'በጎቼ ድምፄን ይሰማሉ እኔም አውቃቸዋለሁ ይከተሉኝማል፤' ይላል ጌታችን ኢየሱስ በዮሐንስ 10:27 ላይ። በዙሪያችን ብዙ ድምፆችና ጫጫታዎች ባሉበት ዘመን የእውነተኛውን እረኛ ድምፅ ለይቶ ማወቅ ወሳኝ ነው። እርሱ ወደ ሕይወትና ወደ እረፍት ይመራናል። ዛሬ ልብህን ለእርሱ ድምፅ ክፈት።",
      tags: ["ዮሐንስ 10", "የእረኛው ድምፅ", "መከተል", "ሕይወት"],
      featured: false,
      views: 610,
      likes: 175,
    },
  ];

  // 5. Verify image uniqueness
  const imageSet = new Set<string>();
  for (const d of devotionsToSeed) {
    if (imageSet.has(d.image)) {
      throw new Error(`DUPLICATE IMAGE DETECTED: ${d.image} in "${d.title}"`);
    }
    imageSet.add(d.image);
  }
  console.log(`\nVerified ${imageSet.size} completely UNIQUE cover images!`);

  // 6. Clear existing devotions and insert the fresh, curated set
  console.log("\nReplacing devotions collection with clean, rich devotions...");
  await DevotionModel.deleteMany({});
  const inserted = await DevotionModel.insertMany(devotionsToSeed);
  console.log(`Successfully seeded ${inserted.length} devotions into MongoDB!`);

  const voiceCount = inserted.filter((d) => d.type === "voice").length;
  const textCount = inserted.filter((d) => d.type === "text").length;
  console.log(`- Voice Devotions (audio + full captions): ${voiceCount}`);
  console.log(`- Text Devotions (full word-for-word text): ${textCount}`);
  console.log(`- Devotions with Official / User profile links: ${inserted.length}`);

  await mongoose.disconnect();
  console.log("Disconnected from MongoDB. Seeding finished cleanly!");
}

seed().catch((err) => {
  console.error("Seeding failed with error:", err);
  process.exit(1);
});
