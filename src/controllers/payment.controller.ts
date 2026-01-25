import { Response } from "express";
import crypto from "crypto";
import { chapaService } from "../services/chapa.service.js";
import {
  TransactionModel,
  TransactionStatus,
} from "../models/transaction.model.js";
import { paymentInitSchema } from "../validators/payment.validator.js";
import { AuthRequest } from "../middleware/auth.middleware.js";

export class PaymentController {
  static async initialize(req: AuthRequest, res: Response) {
    try {
      const parsed = paymentInitSchema.parse(req.body);
      const {
        amount,
        fullName,
        phoneNumber,
        email,
        team,
        department,
        yearOfStudy,
        telegramUserName,
        reason,
      } = parsed;
      const userId = req.user?.sub;

      const tx_ref = `fellow-tx-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`;

      // Create pending transaction in DB
      const transaction = await TransactionModel.create({
        userId,
        fullName,
        phoneNumber,
        team,
        department,
        yearOfStudy,
        telegramUserName,
        tx_ref,
        amount,
        reason,
        status: TransactionStatus.PENDING,
      });

      // Split name for Chapa API
      const nameParts = fullName.trim().split(" ");
      const firstName = nameParts[0];
      const lastName =
        nameParts.length > 1 ? nameParts.slice(1).join(" ") : "Fellow";

      const chapaData = {
        amount,
        currency: "ETB",
        email,
        first_name: firstName,
        last_name: lastName,
        tx_ref,
        callback_url: process.env.CHAPA_CALLBACK_URL,
        return_url: process.env.CHAPA_RETURN_URL,
        customization: {
          title: "Fellowship Pay",
          description: reason || "Payment for Fellowship services",
        },
      };

      const response = await chapaService.initializePayment(chapaData);

      return res.status(200).json({
        success: true,
        data: {
          checkout_url: response.data.checkout_url,
          tx_ref,
          transactionId: transaction._id,
        },
      });
    } catch (err: any) {
      console.error("Payment Init Error:", err);
      if (err?.name === "ZodError") {
        return res.status(400).json({ success: false, errors: err.errors });
      }
      return res.status(500).json({
        success: false,
        message: err.message || "Payment initialization failed",
        error: process.env.NODE_ENV === "development" ? err : undefined,
      });
    }
  }

  static async verify(req: AuthRequest, res: Response) {
    try {
      const { tx_ref } = req.params;

      if (!tx_ref) {
        return res.status(400).json({
          success: false,
          message: "Transaction reference is required",
        });
      }

      const response = await chapaService.verifyPayment(tx_ref);
      const transaction = await TransactionModel.findOne({ tx_ref });

      if (!transaction) {
        return res
          .status(404)
          .json({ success: false, message: "Transaction not found" });
      }

      // Update transaction status if it's successful
      if (response.status === "success" || response.data.status === "success") {
        // Validate amount matches
        if (Number(response.data.amount) !== transaction.amount) {
          transaction.status = TransactionStatus.FAILED;
          await transaction.save();
          return res
            .status(400)
            .json({ success: false, message: "Amount mismatch detected" });
        }

        transaction.status = TransactionStatus.SUCCESS;
        await transaction.save();
      } else if (response.data.status === "failed") {
        transaction.status = TransactionStatus.FAILED;
        await transaction.save();
      }

      return res.status(200).json({
        success: true,
        message: "Transaction verified",
        data: {
          status: transaction.status,
          tx_ref: transaction.tx_ref,
        },
      });
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        message: err.message || "Payment verification failed",
      });
    }
  }

  static async webhook(req: any, res: Response) {
    try {
      const signature = req.headers["x-chapa-signature"] as string;
      const body = req.rawBody || JSON.stringify(req.body);

      // Validate signature
      if (
        !signature ||
        !chapaService.validateWebhookSignature(body, signature)
      ) {
        return res
          .status(401)
          .json({ success: false, message: "Invalid signature" });
      }

      const { tx_ref, status, amount } = req.body;
      const transaction = await TransactionModel.findOne({ tx_ref });

      if (transaction) {
        // If already successful, ignore (idempotency)
        if (transaction.status === TransactionStatus.SUCCESS) {
          return res.status(200).send();
        }

        if (status === "success") {
          // Validate amount
          if (Number(amount) === transaction.amount) {
            transaction.status = TransactionStatus.SUCCESS;
          } else {
            transaction.status = TransactionStatus.FAILED;
          }
        } else if (status === "failed") {
          transaction.status = TransactionStatus.FAILED;
        }

        await transaction.save();
      }

      // Chapa expects a 200 response
      return res.status(200).send();
    } catch (err: any) {
      console.error("Webhook Error:", err);
      return res
        .status(500)
        .json({ success: false, message: "Webhook processing failed" });
    }
  }
}
