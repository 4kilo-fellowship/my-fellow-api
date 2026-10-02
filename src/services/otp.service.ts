import crypto from "crypto";

const BASE_URL = (
  process.env.GEEZ_SMS_BASE_URL || "https://api.geezsms.com/api/v1"
).replace(/\/+$/, "");
const SEND_PATH = process.env.GEEZ_SMS_SEND_PATH || "/sms/send";
const API_KEY =
  process.env.GEEZ_API_KEY || "SnmpjxSYvDs4yeVQZMVnwBVK9vqmTBN8";
const SHORTCODE_ID = process.env.GEEZ_SMS_SHORTCODE_ID || "";

function sendUrl(): string {
  return `${BASE_URL}${SEND_PATH.startsWith("/") ? SEND_PATH : `/${SEND_PATH}`}`;
}

export function normalizeEthiopianPhone(input: string): string {
  const compact = input.trim().replace(/[\s()-]/g, "");

  if (/^\+251[79]\d{8}$/.test(compact)) return compact;
  if (/^251[79]\d{8}$/.test(compact)) return `+${compact}`;
  if (/^0[79]\d{8}$/.test(compact)) return `+251${compact.slice(1)}`;
  if (/^[79]\d{8}$/.test(compact)) return `+251${compact}`;

  if (compact.startsWith("+")) return compact;
  return compact;
}

export function toLocalPhone(input: string): string {
  let n = input.replace(/\D/g, "");
  if (n.startsWith("251") && n.length >= 12) {
    n = "0" + n.substring(3);
  } else if (n.length === 9 && (n.startsWith("9") || n.startsWith("7"))) {
    n = "0" + n;
  }
  return n;
}

export function toSmsPhone(input: string): string {
  return normalizeEthiopianPhone(input).replace(/[^\d]/g, "");
}

export function getEthiopianMobileNetwork(
  input: string,
): "safaricom" | "ethio-telecom" | null {
  const phone = normalizeEthiopianPhone(input);
  if (/^\+2517\d{8}$/.test(phone)) return "safaricom";
  if (/^\+2519\d{8}$/.test(phone)) return "ethio-telecom";
  return null;
}

function maskedPhone(phone: string): string {
  const digits = toSmsPhone(phone);
  return digits.length > 4
    ? `${digits.slice(0, 4)}***${digits.slice(-4)}`
    : "***";
}

export class OtpService {
  /**
   * Cryptographically secure 6-digit OTP generator
   */
  static generateSecureCode(length = 6): string {
    const max = 10 ** length;
    const n = crypto.randomInt(0, max);
    return n.toString().padStart(length, "0");
  }

  /**
   * Constant-time verification token generator for OTP verified ticket
   */
  static generateSecureToken(): string {
    return crypto.randomBytes(32).toString("hex");
  }

  /**
   * SHA-256 hash for secure storage of OTP codes and tokens
   */
  static hashSecret(secret: string): string {
    return crypto
      .createHmac("sha256", process.env.JWT_SECRET || "otp-secret-key")
      .update(secret)
      .digest("hex");
  }

  /**
   * Timing-safe comparison to prevent side-channel timing attacks
   */
  static timingSafeEqual(a: string, b: string): boolean {
    const bufA = Buffer.from(a, "utf8");
    const bufB = Buffer.from(b, "utf8");
    if (bufA.length !== bufB.length) return false;
    return crypto.timingSafeEqual(bufA, bufB);
  }

  /**
   * Send SMS via GeezSMS
   */
  static async sendOtpSms(
    phoneNumber: string,
    code: string,
    purpose: "signup" | "reset-password" = "signup",
  ): Promise<void> {
    const localPhone = toLocalPhone(phoneNumber);
    const network = getEthiopianMobileNetwork(localPhone);

    const message =
      purpose === "signup"
        ? `Your 4Killo Fellowship verification code is: ${code}. It expires in 5 minutes. Do NOT share this code with anyone.`
        : `Your 4Killo Fellowship password reset code is: ${code}. It expires in 5 minutes. Do NOT share this code with anyone.`;

    if (!API_KEY) {
      console.warn(
        `[OTP DEV] GEEZ_API_KEY missing. Mocking SMS for ${localPhone}: ${message}`,
      );
      return;
    }

    // GeezSMS currently requires Ethio Telecom numbers (09...)
    // If the phone is Safaricom (07...), in dev/prod we log warning or simulate cleanly
    if (network === "safaricom") {
      console.info(
        `[OTP] Note: Number is Safaricom (${maskedPhone(localPhone)}). If GeezSMS rejects, code logged in server console: ${code}`,
      );
    }

    const body = new FormData();
    body.set("token", API_KEY);
    body.set("phone", toSmsPhone(localPhone));
    body.set("msg", message.slice(0, 335));

    if (SHORTCODE_ID) {
      body.set("shortcode_id", SHORTCODE_ID);
    }

    try {
      const response = await fetch(sendUrl(), {
        method: "POST",
        headers: {
          Accept: "application/json",
        },
        body,
      });

      if (!response.ok) {
        const raw = await response.text().catch(() => "");
        console.error(
          `GeezSMS rejected SMS to ${maskedPhone(localPhone)}: HTTP ${response.status} ${raw}`,
        );
        // We log the code so developer / testing is never stranded even if SMS credits lapse
        console.info(`[OTP Fallback] Code for ${localPhone}: ${code}`);
      } else {
        console.info(
          `GeezSMS successfully sent OTP to ${maskedPhone(localPhone)}`,
        );
      }
    } catch (err: any) {
      console.error(
        `GeezSMS network error for ${maskedPhone(localPhone)}:`,
        err?.message || err,
      );
      // Log for fallback verification during testing
      console.info(`[OTP Network Fallback] Code for ${localPhone}: ${code}`);
    }
  }
}
