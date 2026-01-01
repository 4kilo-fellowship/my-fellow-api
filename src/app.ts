import express, { Application } from "express";

const app: Application = express();

app.use(express.json());

app.get("/health", (req, res) => {
  res.status(200).json({ status: "OK" });
});

export default app;
