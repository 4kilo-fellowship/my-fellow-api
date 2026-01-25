import crypto from "crypto";

export interface ChapaInitResponse {
  status: string;
  message: string;
  data: {
    checkout_url: string;
  };
}

export interface ChapaVerifyResponse {
  status: string;
  message: string;
  data: {
    amount: number;
    currency: string;
    status: string;
    reference: string;
    tx_ref: string;
  };
}

class ChapaService {
  private secretKey: string;
  private baseUrl = "https://api.chapa.co/v1";

  constructor() {
    this.secretKey = process.env.CHAPA_SECRET_KEY || "";
  }

  async initializePayment(data: {
    amount: number;
    currency: string;
    email: string;
    first_name: string;
    last_name: string;
    tx_ref: string;
    callback_url?: string;
    return_url?: string;
    customization?: {
      title?: string;
      description?: string;
    };
  }): Promise<ChapaInitResponse> {
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
      throw new Error(result.message || "Chapa initialization failed");
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
