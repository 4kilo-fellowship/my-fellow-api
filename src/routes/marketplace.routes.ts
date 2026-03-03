import { Router } from "express";
import { requireAuth, requireAdmin } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
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
  requireAdmin,
  validate(createProductSchema),
  ProductController.create,
);

router.put(
  "/products/:id",
  requireAuth,
  requireAdmin,
  validate(updateProductSchema),
  ProductController.update,
);

router.delete(
  "/products/:id",
  requireAuth,
  requireAdmin,
  ProductController.remove,
);

router.post(
  "/orders",
  requireAuth,
  validate(createOrderSchema),
  OrderController.create,
);

router.get("/orders/my", requireAuth, OrderController.getMyOrders);

router.get("/orders", requireAuth, requireAdmin, OrderController.getAll);

router.get("/orders/:id", requireAuth, OrderController.getById);

router.patch(
  "/orders/:id/status",
  requireAuth,
  requireAdmin,
  validate(updateOrderStatusSchema),
  OrderController.updateStatus,
);

export default router;
