import "dotenv/config";
import { MongoClient } from "mongodb";

const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  throw new Error("MONGO_URI is not defined in environment variables");
}

export const mongoClient = new MongoClient(MONGO_URI);
export const mongoDb = mongoClient.db();
