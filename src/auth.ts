import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { bearer, phoneNumber } from "better-auth/plugins";
import { OtpRecordModel } from "./models/otp.model.js";
import { OtpService, toLocalPhone } from "./services/otp.service.js";
import { mongoDb } from "./utils/mongodb.js";

const isProd = process.env.NODE_ENV === "production";

export const auth = betterAuth({
  database: mongodbAdapter(mongoDb),
  secret:
    process.env.BETTER_AUTH_SECRET ||
    process.env.JWT_SECRET ||
    "962fA3!sdfxQmR2$7Lsfd@KzYHcW8eP8sdsfsdfN4bT6SdJ_BETTER_AUTH",
  baseURL:
    process.env.API_URL ||
    (isProd
      ? "https://my-fellow-api-6v2i.onrender.com"
      : "http://localhost:3000"),
  basePath: "/api/auth",
  user: {
    additionalFields: {
      team: {
        type: "string",
        required: false,
      },
      department: {
        type: "string",
        required: false,
      },
      yearOfStudy: {
        type: "string",
        required: false,
      },
      telegramUserName: {
        type: "string",
        required: false,
      },
      role: {
        type: "string",
        required: false,
        defaultValue: "user",
      },
      profileImage: {
        type: "string",
        required: false,
      },
    },
  },
  trustedOrigins: [
    "http://localhost:3000",
    "http://localhost:8081",
    "http://localhost:19000",
    "http://localhost:19006",
    "exp://*",
    "https://*.onrender.com",
    "https://*.primeuat.app",
    "https://fellow.primeuat.app",
  ],
  rateLimit: {
    enabled: true,
    window: 60,
    max: 100,
    customRules: {
      "/send-verification-code": { window: 60, max: 5 },
      "/verify-phone-number": { window: 60, max: 10 },
      "/sign-in/phone-number": { window: 60, max: 10 },
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 24 hours
  },
  plugins: [
    bearer(),
    phoneNumber({
      sendOTP: async ({ phoneNumber: phone, code }, request) => {
        const localPhone = toLocalPhone(phone);
        const codeHash = OtpService.hashSecret(code);
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

        // Persist code hash with rate limits
        await OtpRecordModel.create({
          phoneNumber: localPhone,
          codeHash,
          purpose: "signup",
          expiresAt,
        });

        await OtpService.sendOtpSms(localPhone, code, "signup");
      },
      otpLength: 6,
      expiresIn: 300, // 5 minutes
    }),
  ],
});

