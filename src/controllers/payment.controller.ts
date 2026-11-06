import { Response } from "express";
import crypto from "crypto";
import { JamiSignatureError } from "jami-sdk";
import { jamiService } from "../services/jami.service.js";
import {
  TransactionModel,
  TransactionStatus,
} from "../models/transaction.model.js";
import { paymentInitSchema } from "../validators/payment.validator.js";
import { AuthRequest } from "../middleware/auth.middleware.js";
import { UserModel } from "../models/user.model.js";
import { routeParam } from "../utils/routeParam.js";

export class PaymentController {
  static async initializeJami(req: AuthRequest, res: Response) {
    try {
      const parsed = paymentInitSchema.parse(req.body);
      const { amount, email, phone, reason, returnUrl } = parsed;
      const userId = req.user?.sub;

      if (!userId) {
        return res
          .status(401)
          .json({ success: false, message: "User not authenticated" });
      }

      const user = await UserModel.findById(userId);
      if (!user) {
        return res
          .status(404)
          .json({ success: false, message: "User not found" });
      }

      const tx_ref = `fellow-jami-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`;
      const resolvedEmail =
        email?.trim() ||
        (user.phoneNumber
          ? `${user.phoneNumber.replace(/\D/g, "")}@myfellow.et`
          : `donor-${userId}@myfellow.et`);

      const checkout = await jamiService.initializeCheckout({
        amount,
        email: resolvedEmail,
        phone: phone || user.phoneNumber,
        name: user.fullName,
        reason: reason || "Donation",
        returnUrl: returnUrl || process.env.JAMI_RETURN_URL,
        userId,
        tx_ref,
      });

      const checkoutUrl =
        "checkoutUrl" in checkout ? checkout.checkoutUrl : null;

      const transaction = await TransactionModel.create({
        userId,
        tx_ref,
        sessionId: checkout.sessionId,
        provider: "jami",
        amount,
        reason: reason || "Donation",
        status: TransactionStatus.PENDING,
      });

      return res.status(200).json({
        success: true,
        data: {
          checkout_url: checkoutUrl,
          checkoutUrl: checkoutUrl,
          sessionId: checkout.sessionId,
          tx_ref,
          transactionId: transaction._id,
        },
      });
    } catch (err: any) {
      console.error("Jami Payment Init Error:", err);

      if (err?.name === "ZodError") {
        return res.status(400).json({ success: false, errors: err.errors });
      }

      return res.status(500).json({
        success: false,
        message: err.message || "Jami checkout initialization failed",
        error: process.env.NODE_ENV === "development" ? err : undefined,
      });
    }
  }

  static async verifyJami(req: AuthRequest, res: Response) {
    try {
      const sessionId = routeParam(req.params.sessionId);

      if (!sessionId) {
        return res.status(400).json({
          success: false,
          message: "Session ID or transaction reference is required",
        });
      }

      const transaction = await TransactionModel.findOne({
        $or: [{ sessionId }, { tx_ref: sessionId }],
      });

      if (!transaction) {
        return res
          .status(404)
          .json({ success: false, message: "Transaction not found" });
      }

      // If already succeeded via webhook, return immediately
      if (transaction.status === TransactionStatus.SUCCESS) {
        return res.status(200).json({
          success: true,
          message: "Transaction status resolved",
          data: {
            status: transaction.status,
            tx_ref: transaction.tx_ref,
            sessionId: transaction.sessionId,
            orderId: transaction.orderId || null,
            orderStatus: "paid",
            failure: null,
          },
        });
      }

      const session = await jamiService.verifyCheckout(
        transaction.sessionId || sessionId,
      );

      if (session.status === "completed" || session.orderStatus === "paid") {
        const paidSantim = session.amount ?? 0;
        const expectedSantim = Math.round(transaction.amount * 100);

        if (paidSantim !== expectedSantim) {
          transaction.status = TransactionStatus.FAILED;
          await transaction.save();
          return res.status(400).json({
            success: false,
            message: "Amount mismatch detected",
          });
        }

        transaction.status = TransactionStatus.SUCCESS;
        if (session.orderId) {
          transaction.orderId = session.orderId;
        }
        await transaction.save();
      } else if (
        session.status === "expired" ||
        session.orderStatus === "failed"
      ) {
        transaction.status = TransactionStatus.FAILED;
        await transaction.save();
      }

      return res.status(200).json({
        success: true,
        message: "Transaction status resolved",
        data: {
          status: transaction.status,
          tx_ref: transaction.tx_ref,
          sessionId: transaction.sessionId,
          orderId: session.orderId,
          orderStatus: session.orderStatus,
          failure: session.failure,
          attempt: session.attempt,
        },
      });
    } catch (err: any) {
      console.error("Jami Verify Error:", err);
      return res.status(500).json({
        success: false,
        message: err.message || "Payment verification failed",
      });
    }
  }

  static async jamiWebhook(req: any, res: Response) {
    try {
      const signature = req.headers["x-jamidev-signature"] as string;
      const rawPayload = req.rawBody
        ? req.rawBody.toString("utf8")
        : typeof req.body === "string"
          ? req.body
          : JSON.stringify(req.body);

      if (!signature) {
        return res.status(400).json({
          success: false,
          message: "Missing x-jamidev-signature header",
        });
      }

      const event = await jamiService.verifyWebhook(rawPayload, signature);

      if (event.type === "order.completed" || event.type === "order.created") {
        const orderData = event.data;
        const { sessionId, orderId, amount, status, metadata } = orderData;
        const tx_ref = (metadata as any)?.tx_ref;

        const transaction = await TransactionModel.findOne({
          $or: [{ sessionId }, ...(tx_ref ? [{ tx_ref }] : [])],
        });

        if (transaction) {
          if (transaction.status === TransactionStatus.SUCCESS) {
            return res.status(200).json({ received: true });
          }

          const expectedSantim = Math.round(transaction.amount * 100);
          if (amount === expectedSantim) {
            if (status === "paid" || event.type === "order.completed") {
              transaction.status = TransactionStatus.SUCCESS;
              if (orderId) {
                transaction.orderId = orderId;
              }
            } else if (status === "failed") {
              transaction.status = TransactionStatus.FAILED;
            }
          } else {
            transaction.status = TransactionStatus.FAILED;
          }

          await transaction.save();
        }
      } else if (event.type === "checkout.session.expired") {
        const { sessionId } = event.data;
        const transaction = await TransactionModel.findOne({ sessionId });
        if (transaction && transaction.status === TransactionStatus.PENDING) {
          transaction.status = TransactionStatus.FAILED;
          await transaction.save();
        }
      }

      return res.status(200).json({ received: true });
    } catch (err: any) {
      if (err instanceof JamiSignatureError) {
        return res.status(400).json({
          success: false,
          message: "Invalid webhook signature",
        });
      }
      console.error("Jami Webhook Error:", err);
      return res.status(400).json({
        success: false,
        message: err.message || "Webhook verification failed",
      });
    }
  }

  static async getMyGivings(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.sub;

      if (!userId) {
        return res
          .status(401)
          .json({ success: false, message: "User not authenticated" });
      }

      const givings = await TransactionModel.find({ userId })
        .sort({ createdAt: -1 })
        .lean();

      return res.status(200).json({
        success: true,
        count: givings.length,
        data: givings,
      });
    } catch (err: any) {
      console.error("Get My Givings Error:", err);
      return res.status(500).json({
        success: false,
        message: err.message || "Failed to fetch givings",
      });
    }
  }
}
