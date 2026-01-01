import express from "express";
import "dotenv/config";
const app = express();

const PORT = process.env.PORT;

app.get("/", (req, res) => {
  res.send("This is from Backend");
});

app.listen(3000, () => {
  console.log(`Server is running on port ${PORT}`);
});
