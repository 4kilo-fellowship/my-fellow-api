import { CronJob } from "cron";
import https from "https";
import EventModel from "../models/event.model.js";

export async function sweepExpiredEvents(): Promise<number> {
  try {
    const now = new Date();
    const result = await EventModel.updateMany(
      {
        isDeleted: { $ne: true },
        isPublished: { $ne: false },
        endDate: { $lt: now },
      },
      {
        $set: {
          isPublished: false,
          autoUnpublished: true,
        },
      },
    );
    if (result.modifiedCount > 0) {
      console.log(
        `[AutoUnpublish] Successfully unpublished ${result.modifiedCount} outdated/expired events.`,
      );
    }
    return result.modifiedCount;
  } catch (err) {
    console.error("[AutoUnpublish] Error sweeping expired events:", err);
    return 0;
  }
}

const job = new CronJob("*/9 * * * *", async () => {
  if (process.env.API_URL) {
    https
      .get(`${process.env.API_URL}/health`, (res) => {
        if (res.statusCode === 200) {
          console.log("GET request sent successfully");
        } else {
          console.log("GET request failed", res.statusCode);
        }
      })
      .on("error", (e) => {
        console.error("Error while sending request", e);
      });
  }

  // Automatically sweep and unpublish any events whose endDate has passed
  await sweepExpiredEvents();
});

export default job;
