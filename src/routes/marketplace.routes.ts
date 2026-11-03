import { Router } from "express";
import { requireAuth, requirePermission } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import { uploadMultiple } from "../middleware/upload.middleware.js";
import {
  createProductSchema,
  updateProductSchema,
  createOrderSchema,
  updateOrderStatusSchema,
} from "../validators/marketplace.validator.js";
import ProductController from "../controllers/product.controller.js";
import OrderController from "../controllers/order.controller.js";

const router = Router();

router.get("/products", ProductController.getAll);
router.get("/products/:id", ProductController.getById);

router.post(
  "/products",
  requireAuth,
  requirePermission("finance.view"),
  uploadMultiple,
  validate(createProductSchema),
  ProductController.create,
);

router.put(
  "/products/:id",
  requireAuth,
  requirePermission("finance.view"),
  uploadMultiple,
  validate(updateProductSchema),
  ProductController.update,
);

router.delete(
  "/products/:id",
  requireAuth,
  requirePermission("finance.view"),
  ProductController.remove,
);

router.post(
  "/orders",
  requireAuth,
  validate(createOrderSchema),
  OrderController.create,
);

router.get("/orders/my", requireAuth, OrderController.getMyOrders);

router.get("/orders", requireAuth, requirePermission("finance.view"), OrderController.getAll);

router.get("/orders/:id", requireAuth, OrderController.getById);

router.patch(
  "/orders/:id/status",
  requireAuth,
  requirePermission("finance.view"),
  validate(updateOrderStatusSchema),
  OrderController.updateStatus,
);

export default router;
