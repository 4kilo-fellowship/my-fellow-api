import crypto from "crypto";
import { Request, Response, NextFunction } from "express";
import { prisma } from "../utils/prisma.js";
import { AppError } from "./errors.js";
import { AuthRequest } from "../middleware/auth.middleware.js";

export function idempotencyMiddleware() {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    // Only apply to state-modifying requests (POST, PUT, PATCH, DELETE)
    if (["GET", "HEAD", "OPTIONS"].includes(req.method)) {
      return next();
    }

    const key = (req.headers["idempotency-key"] as string) || (req.headers["Idempotency-Key"] as string);
    if (!key) {
      return next();
    }

    const userId = req.user?.sub;
    if (!userId) {
      return next();
    }

    const requestHash = crypto
      .createHash("sha256")
      .update(`${req.method}:${req.originalUrl}:${JSON.stringify(req.body || {})}`)
      .digest("hex");

    try {
      const existing = await prisma.idempotencyKey.findUnique({
        where: {
          userId_key: {
            userId,
            key,
          },
        },
      });

      if (existing) {
        if (existing.requestHash !== requestHash) {
          throw AppError.unprocessable(
            "Idempotency key reused with a different request payload",
            "IDEMPOTENCY_KEY_PAYLOAD_MISMATCH"
          );
        }

        if (existing.responseStatus) {
          return res.status(existing.responseStatus).json(existing.responseBody);
        }
      } else {
        // Record key as pending
        await prisma.idempotencyKey.create({
          data: {
            userId,
            key,
            requestHash,
          },
        });
      }

      // Intercept response to store response body & status
      const originalJson = res.json.bind(res);
      res.json = (body: any) => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          prisma.idempotencyKey
            .update({
              where: { userId_key: { userId, key } },
              data: {
                responseStatus: res.statusCode,
                responseBody: body,
              },
            })
            .catch((err) => {
              console.error("[Idempotency] Failed to store response body:", err);
            });
        }
        return originalJson(body);
      };

      next();
    } catch (err) {
      next(err);
    }
  };
}
