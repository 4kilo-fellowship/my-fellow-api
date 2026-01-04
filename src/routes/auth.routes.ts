import { Router } from "express";
import { AuthController } from "../controllers/auth.controller.js";

const router = Router();

router.post("/signup", AuthController.register);
router.post("/signin", AuthController.login);

export default router;
