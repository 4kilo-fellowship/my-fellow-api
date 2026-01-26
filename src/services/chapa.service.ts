import crypto from "crypto";
import {
  ChapaInitPayload,
  ChapaInitResponse,
  ChapaVerifyResponse,
} from "../types/types.js";
import { CHAPA_BASE_URL } from "../config/chapa.js";

class ChapaService {
  private secretKey: string;
  private baseUrl = CHAPA_BASE_URL;

  constructor() {
    this.secretKey = process.env.CHAPA_SECRET_KEY || "";
  }

  async initializePayment(data: ChapaInitPayload): Promise<ChapaInitResponse> {
    if (!this.secretKey || !this.secretKey.startsWith("CHASECK")) {
      throw new Error("Chapa API Key is not configured correctly in .env");
    }

    const response = await fetch(`${this.baseUrl}/transaction/initialize`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.secretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    const result = await response.json();

    if (!response.ok) {
      const errorMessage =
        typeof result.message === "object"
          ? JSON.stringify(result.message)
          : result.message;
      throw new Error(errorMessage || "Chapa initialization failed");
    }

    return result as ChapaInitResponse;
  }

  async verifyPayment(tx_ref: string): Promise<ChapaVerifyResponse> {
    const response = await fetch(
      `${this.baseUrl}/transaction/verify/${tx_ref}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${this.secretKey}`,
        },
      },
    );

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || "Chapa verification failed");
    }

    return result as ChapaVerifyResponse;
  }

  validateWebhookSignature(body: string | Buffer, signature: string): boolean {
    const hash = crypto
      .createHmac("sha256", process.env.CHAPA_WEBHOOK_SECRET || this.secretKey)
      .update(body)
      .digest("hex");
    return hash === signature;
  }
}

export const chapaService = new ChapaService();
