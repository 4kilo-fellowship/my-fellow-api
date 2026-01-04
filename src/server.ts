import "dotenv/config";
import app from "./app.js";
import mongoose from "mongoose";

const PORT = process.env.PORT || 4000;
const MONGO_URI = process.env.MONGO_URI;

mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log("MongoDB connected");
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch((err) => {
    console.error("Mongo connection error:", err);
    process.exit(1);
  });

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
