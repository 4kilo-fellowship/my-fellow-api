import "dotenv/config";
import mongoose from "mongoose";
import { Product } from "../src/models/product.model.js";

const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error("❌ MONGO_URI is not defined in environment variables");
  process.exit(1);
}

const PRODUCTS_DATA = [
  // --- T-SHIRTS ---
  {
    title: "4 Kilo Fellowship Classic Tee",
    shortDescription:
      "Signature 100% heavy cotton tee featuring the 4 Kilo ECSF emblem and 'Rooted & Built Up in Christ' (Colossians 2:6-7).",
    price: 650,
    category: "t-shirt",
    stock: 50,
    imageUrls: [
      "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?auto=format&fit=crop&w=800&q=80",
    ],
  },
  {
    title: "Grace Greater Than Our Sin Vintage Tee",
    shortDescription:
      "Vintage washed charcoal t-shirt inspired by Romans 5:20. Soft, breathable, and designed for daily campus wear.",
    price: 680,
    category: "t-shirt",
    stock: 35,
    imageUrls: [
      "https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?auto=format&fit=crop&w=800&q=80",
    ],
  },
  {
    title: "Lion of Judah Campus Tee",
    shortDescription:
      "Bold Christian streetwear tee with Ethiopian cross and Lion of Judah typography. 'He who began a good work in you will complete it.'",
    price: 700,
    category: "t-shirt",
    stock: 40,
    imageUrls: [
      "https://images.unsplash.com/photo-1576566588028-4147f3842f27?auto=format&fit=crop&w=800&q=80",
    ],
  },
  {
    title: "More Than Conquerors Athletic Tee",
    shortDescription:
      "Lightweight athletic moisture-wicking tee for fellowship sports days and campus outreach events. Romans 8:37.",
    price: 620,
    category: "t-shirt",
    stock: 25,
    imageUrls: [
      "https://images.unsplash.com/photo-1618354691373-d851c5c3a990?auto=format&fit=crop&w=800&q=80",
    ],
  },

  // --- HOODIES ---
  {
    title: "Deeply Rooted Heavyweight Hoodie",
    shortDescription:
      "Cozy 400 GSM brushed fleece hoodie in forest green with embroidered 4 Kilo Fellowship sleeve logo. Perfect for cold Addis mornings.",
    price: 1450,
    category: "hoodie",
    stock: 30,
    imageUrls: [
      "https://images.unsplash.com/photo-1556905055-8f358a7a47b2?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1509967419530-da38b4704bc6?auto=format&fit=crop&w=800&q=80",
    ],
  },
  {
    title: "Faith Over Fear Oversized Ochre Hoodie",
    shortDescription:
      "Warm ochre orange oversized hoodie with minimalist front print and Isaiah 41:10 verse on back.",
    price: 1500,
    category: "hoodie",
    stock: 20,
    imageUrls: [
      "https://images.unsplash.com/photo-1543163521-1bf539c55dd2?auto=format&fit=crop&w=800&q=80",
    ],
  },
  {
    title: "Holy Spirit Revival Pullover Hoodie",
    shortDescription:
      "Minimalist black pullover hoodie with subtle Christian cross embroidery on chest and 'Acts 1:8' on hood cuff.",
    price: 1400,
    category: "hoodie",
    stock: 28,
    imageUrls: [
      "https://images.unsplash.com/photo-1578587018452-892bacefd3f2?auto=format&fit=crop&w=800&q=80",
    ],
  },

  // --- STICKERS ---
  {
    title: "Campus Prayer Warrior Sticker Pack",
    shortDescription:
      "Set of 5 waterproof, vinyl die-cut stickers for laptops, notebooks, and water bottles. Includes Fellowship cross, 'Pray Without Ceasing', and campus revival emblems.",
    price: 150,
    category: "stickers",
    stock: 120,
    imageUrls: [
      "https://images.unsplash.com/photo-1589384267710-7a25bc244a5f?auto=format&fit=crop&w=800&q=80",
    ],
  },
  {
    title: "Rooted in Faith Holographic Sticker",
    shortDescription:
      "Prismatic holographic sticker displaying Colossians 2:7 tree emblem. Scratch-resistant and UV coated.",
    price: 80,
    category: "stickers",
    stock: 90,
    imageUrls: [
      "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?auto=format&fit=crop&w=800&q=80",
    ],
  },
  {
    title: "Fishers of Men Die-Cut Decal",
    shortDescription:
      "Minimalist Ichthys symbol with contemporary geometric lines. Perfect for car windows, phones, and dorm doors.",
    price: 70,
    category: "stickers",
    stock: 150,
    imageUrls: [
      "https://images.unsplash.com/photo-1572375992501-4b0892d50c69?auto=format&fit=crop&w=800&q=80",
    ],
  },

  // --- ACCESSORIES ---
  {
    title: "Fellowship Thermal Flask (750ml)",
    shortDescription:
      "Double-wall insulated stainless steel water bottle with laser-engraved 4 Kilo Fellowship cross. Keeps hot for 12h, cold for 24h.",
    price: 750,
    category: "accessories",
    stock: 45,
    imageUrls: [
      "https://images.unsplash.com/photo-1602143407151-7111542de6e8?auto=format&fit=crop&w=800&q=80",
    ],
  },
  {
    title: "Scripture Leather Journal & Pen Set",
    shortDescription:
      "Handmade faux-leather lined notebook with embossed Christian cross and bookmark ribbon. Includes brass metallic pen.",
    price: 520,
    category: "accessories",
    stock: 60,
    imageUrls: [
      "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=800&q=80",
    ],
  },
  {
    title: "Worship Team Woven Canvas Tote Bag",
    shortDescription:
      "Durable natural canvas tote bag for Bible study materials, books, and campus essentials with reinforced handles.",
    price: 380,
    category: "accessories",
    stock: 75,
    imageUrls: [
      "https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=800&q=80",
    ],
  },
  {
    title: "4 Kilo Fellowship Embroidered Cap",
    shortDescription:
      "Low-profile 6-panel unstructured dad cap with subtle cross embroidery. Adjustable brass strap buckle.",
    price: 450,
    category: "accessories",
    stock: 35,
    imageUrls: [
      "https://images.unsplash.com/photo-1588850561407-ed78c282e89b?auto=format&fit=crop&w=800&q=80",
    ],
  },
];

async function seed() {
  console.log("🌱 Connecting to MongoDB to seed marketplace products...");
  await mongoose.connect(MONGO_URI!);

  console.log("🧹 Clearing old products (if any)...");
  await Product.deleteMany({});

  console.log(`📦 Inserting ${PRODUCTS_DATA.length} marketplace products...`);
  const inserted = await Product.insertMany(PRODUCTS_DATA);

  console.log(`✅ Successfully seeded ${inserted.length} spiritual merchandise items into MongoDB!`);
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
