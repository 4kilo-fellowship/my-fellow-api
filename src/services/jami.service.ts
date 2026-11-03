import { Jami, type CheckoutStatus, type JamiWebhookEvent } from "jami-sdk";

export interface InitializeCheckoutParams {
  amount: number; // Amount in ETB
  email: string;
  phone?: string;
  reason?: string;
  returnUrl?: string;
  userId: string;
  tx_ref: string;
}

export class JamiService {
  private client: Jami | null = null;

  private getClient(): Jami {
    if (!this.client) {
      const token = process.env.JAMI_TOKEN || "";
      if (!token) {
        throw new Error("Jami API Token (JAMI_TOKEN) is not configured in .env");
      }
      this.client = new Jami({ token });
    }
    return this.client;
  }

  constructor() {
    const token = process.env.JAMI_TOKEN || "";
    if (!token) {
      console.warn("⚠️ JAMI_TOKEN is not configured in environment variables.");
    }
  }

  /**
   * Normalizes Ethiopian phone numbers into E.164 format without '+' (e.g. 251911223344)
   */
  private normalizeEthiopianPhone(phone?: string): string | undefined {
    if (!phone) return undefined;
    const cleaned = phone.replace(/[\s\-\+\(\)]/g, "");
    if (cleaned.startsWith("0")) {
      return `251${cleaned.slice(1)}`;
    }
    if (cleaned.startsWith("251")) {
      return cleaned;
    }
    return cleaned;
  }

  /**
   * Initializes a Jami checkout session.
   * If gateway is omitted, Jami provides a hosted payment page allowing the user
   * to select Telebirr, CBE Birr, M-Pesa, or card.
   */
  async initializeCheckout(params: InitializeCheckoutParams) {
    if (!process.env.JAMI_TOKEN) {
      throw new Error("Jami API Token (JAMI_TOKEN) is not configured in .env");
    }

    // Jami expects integer ETB minor units (santim): 100.00 ETB = 10000 santim
    const amountSantim = Math.round(params.amount * 100);
    if (amountSantim < 100) {
      throw new Error("Minimum transaction amount is 1 ETB (100 santim)");
    }

    const description = (params.reason || "Donation to 4 Kilo Fellowship").slice(0, 120);
    const normalizedPhone = this.normalizeEthiopianPhone(params.phone);

    const checkout = await this.getClient().createCheckout({
      amount: amountSantim,
      description,
      customer: {
        email: params.email,
        phone: normalizedPhone,
        externalId: params.userId,
      },
      metadata: {
        tx_ref: params.tx_ref,
        userId: params.userId,
      },
      successUrl:
        params.returnUrl ||
        process.env.JAMI_RETURN_URL ||
        "https://my-fellow-api-6v2i.onrender.com/api/payments/success",
    });

    return checkout;
  }

  /**
   * Retrieves live checkout status from Jami.
   * Reconciles actively with the payment provider.
   */
  async verifyCheckout(sessionId: string): Promise<CheckoutStatus> {
    if (!sessionId) {
      throw new Error("Session ID is required to verify checkout");
    }
    return this.getClient().getCheckoutStatus(sessionId);
  }

  /**
   * Verifies the cryptographic HMAC signature of an incoming webhook from Jami.
   */
  async verifyWebhook(payload: string, signature: string): Promise<JamiWebhookEvent> {
    const secret = process.env.JAMI_WEBHOOK_SECRET;
    if (!secret) {
      throw new Error("JAMI_WEBHOOK_SECRET is not configured in .env");
    }

    return this.getClient().webhooks.verify({
      payload,
      signature,
      secret,
    });
  }
}

export const jamiService = new JamiService();
