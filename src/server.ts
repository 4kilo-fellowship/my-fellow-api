import "dotenv/config";
import app from "./app.js";
import mongoose from "mongoose";

import { mongoClient } from "./utils/mongodb.js";
import { sweepExpiredEvents } from "./utils/cron.js";
import { ensureDefaultActors } from "./modules/actors/actor.service.js";

const PORT: number = Number(process.env.PORT) || 4000;
const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  throw new Error("MONGO_URI is not defined in environment variables");
}

Promise.all([
  mongoose.connect(MONGO_URI),
  mongoClient.connect(),
])
  .then(async () => {
    console.log("MongoDB (Mongoose & MongoClient) connected successfully");

    // Perform initial sweep of expired events immediately on server start
    await sweepExpiredEvents().catch((e) =>
      console.error("Initial sweep failed:", e),
    );

    // Ensure canonical actors (8 teams + official fellowship identity)
    await ensureDefaultActors().catch((e) =>
      console.error("Actor initialization failed:", e),
    );

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Mongo connection error:", err);
    process.exit(1);
  });
