import { NextFunction, Request, Response, Router } from "express";
import { AuthController } from "../controllers/auth.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { uploadSingle } from "../middleware/upload.middleware.js";
import multer, { MulterError } from "multer";

const router = Router();

// create a middleware to handle multer
const handleMulterError = (err: Error | MulterError, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ 
        success: false, 
        message: "File size too large. Maximum size is 5MB." 
      });
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({ 
        success: false, 
        message: `Unexpected file field. Please use the field name "image" for file uploads.` 
      });
    }
    if (err.message && err.message.includes('field name')) {
      return res.status(400).json({ 
        success: false, 
        message: 'File upload error: Please send the image file with the field name "image" in form-data format. Do not set Content-Type header manually.' 
      });
    }
    return res.status(400).json({ 
      success: false, 
      message: `File upload error: ${err.message}` 
    });
  }
  if (err) {
    return res.status(400).json({ 
      success: false, 
      message: err.message || "File upload error" 
    });
  }
  next();
};

router.post("/signup", uploadSingle, handleMulterError, AuthController.register);
router.post("/signin", AuthController.login);
router.get("/me", requireAuth, AuthController.getMe);

export default router;
