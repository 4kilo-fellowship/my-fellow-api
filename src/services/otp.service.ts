import bcrypt from "bcrypt";
import crypto from "crypto";
import { OtpPurpose } from "../models/otpVerification.model.js";
import { OtpVerificationModel } from "../models/otpVerification.model.js";
import { signJwt, verifyJwt } from "../utils/jwt.js";
import { smsService } from "./sms.service.js";

const OTP_LENGTH = 6;
const OTP_EXPIRY_MS = 10 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;
const MAX_ATTEMPTS = 5;
const MAX_SENDS_PER_WINDOW = 5;
const SEND_WINDOW_MS = 60 * 60 * 1000;
const OTP_TOKEN_TTL = "15m";

export interface OtpTokenPayload {
  otpId: string;
  phoneNumber: string;
  purpose: OtpPurpose;
}

export class OtpService {
  private static generateCode(): string {
    const min = Math.pow(10, OTP_LENGTH - 1);
    const max = Math.pow(10, OTP_LENGTH) - 1;
    return String(crypto.randomInt(min, max + 1));
  }

  private static buildMessage(code: string): string {
    return `Your My Fellow verification code is: ${code}. Valid for 10 minutes.`;
  }

  static async send(phoneNumber: string, purpose: OtpPurpose): Promise<void> {
    const now = Date.now();
    const existing = await OtpVerificationModel.findOne({
      phoneNumber,
      purpose,
      consumed: false,
    });

    if (existing) {
      if (existing.lastSentAt && now - existing.lastSentAt.getTime() < RESEND_COOLDOWN_MS) {
        throw new Error("Please wait before requesting another code.");
      }

      if (existing.sendCount >= MAX_SENDS_PER_WINDOW) {
        throw new Error("Too many requests. Please try again later.");
      }
    }

    const code = this.generateCode();
    const codeHash = await bcrypt.hash(code, 10);

    if (existing) {
      existing.codeHash = codeHash;
      existing.expiresAt = new Date(now + OTP_EXPIRY_MS);
      existing.attempts = 0;
      existing.consumed = false;
      existing.lastSentAt = new Date(now);
      existing.sendCount += 1;
      await existing.save();
    } else {
      await OtpVerificationModel.create({
        phoneNumber,
        purpose,
        codeHash,
        expiresAt: new Date(now + OTP_EXPIRY_MS),
        attempts: 0,
        consumed: false,
        lastSentAt: new Date(now),
        sendCount: 1,
      });
    }

    await smsService.send(phoneNumber, this.buildMessage(code));
  }

  static async verify(
    phoneNumber: string,
    purpose: OtpPurpose,
    code: string,
  ): Promise<string> {
    const record = await OtpVerificationModel.findOne({
      phoneNumber,
      purpose,
      consumed: false,
    });

    if (!record) {
      throw new Error("No verification request found for this phone number.");
    }

    if (record.expiresAt.getTime() < Date.now()) {
      throw new Error("This code has expired. Please request a new one.");
    }

    if (record.attempts >= MAX_ATTEMPTS) {
      throw new Error("Too many failed attempts. Please request a new code.");
    }

    const matches = await bcrypt.compare(code, record.codeHash);
    if (!matches) {
      record.attempts += 1;
      await record.save();
      throw new Error("Incorrect code. Please try again.");
    }

    record.consumed = true;
    await record.save();

    return signJwt(
      {
        otpId: String(record._id),
        phoneNumber: record.phoneNumber,
        purpose: record.purpose,
      } satisfies OtpTokenPayload,
      { expiresIn: OTP_TOKEN_TTL },
    );
  }

  static assertToken(
    token: string,
    phoneNumber: string,
    purpose: OtpPurpose,
  ): void {
    const payload = verifyJwt<OtpTokenPayload>(token);
    if (
      payload.phoneNumber !== phoneNumber ||
      payload.purpose !== purpose
    ) {
      throw new Error("Phone number verification is required.");
    }
  }
}
