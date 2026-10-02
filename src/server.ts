import "dotenv/config";
import app from "./app.js";
import mongoose from "mongoose";

import { mongoClient } from "./utils/mongodb.js";

const PORT: number = Number(process.env.PORT) || 4000;
const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  throw new Error("MONGO_URI is not defined in environment variables");
}

Promise.all([
  mongoose.connect(MONGO_URI),
  mongoClient.connect(),
])
  .then(() => {
    console.log("MongoDB (Mongoose & MongoClient) connected successfully");

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Mongo connection error:", err);
    process.exit(1);
  });
