const GEEZ_SMS_URL = "https://api.geezsms.com/api/v1/sms/send";

export class SmsService {
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.GEEZ_API_KEY || "";
  }

  private assertConfigured(): void {
    if (!this.apiKey) {
      throw new Error("GEEZ_API_KEY is not configured");
    }
  }

  private toInternational(phone: string): string {
    const digits = phone.replace(/\D/g, "");
    if (digits.startsWith("251")) {
      return digits;
    }
    return `251${digits.replace(/^0/, "")}`;
  }

  async send(phone: string, message: string): Promise<void> {
    this.assertConfigured();

    const response = await fetch(GEEZ_SMS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token: this.apiKey,
        phone: this.toInternational(phone),
        msg: message,
      }),
    });

    if (!response.ok) {
      throw new Error("SMS delivery failed");
    }
  }
}

export const smsService = new SmsService();
