import { Router } from "express";
import { rateLimit } from "express-rate-limit";

import { authenticate } from "../../middleware/auth.middleware.js";

import {
    changePasswordController,
    forgotPasswordController,
    loginController,
    logoutController,
    meController,
    refreshController,
    registerController,
    resendVerificationController,
    resetPasswordController,
    updateMeController,
    verifyEmailController,
} from "./auth.controller.js";

const router = Router();

const limiter = (limit: number, minutes: number, message: string) =>
    rateLimit({
        windowMs: minutes * 60 * 1000,
        limit,
        standardHeaders: true,
        legacyHeaders: false,
        message: { success: false, message, code: "RATE_LIMITED" },
    });

// Per-IP limits. Account lockout (per account) is handled in the service.
const loginLimiter = limiter(
    Number(process.env.LOGIN_RATE_LIMIT || 20),
    15,
    "Too many login attempts. Please try again later."
);
const registerLimiter = limiter(
    Number(process.env.REGISTER_RATE_LIMIT || 10),
    60,
    "Too many registration attempts. Please try again later."
);
const emailActionLimiter = limiter(
    Number(process.env.EMAIL_ACTION_RATE_LIMIT || 10),
    15,
    "Too many requests. Please try again later."
);
const refreshLimiter = limiter(60, 15, "Too many requests.");

/* ----- public ----- */
router.post("/login", loginLimiter, loginController);
router.post("/register", registerLimiter, registerController);
router.post("/verify-email", emailActionLimiter, verifyEmailController);
router.post(
    "/resend-verification",
    emailActionLimiter,
    resendVerificationController
);
router.post(
    "/forgot-password",
    emailActionLimiter,
    forgotPasswordController
);
router.post(
    "/reset-password",
    emailActionLimiter,
    resetPasswordController
);

/* ----- session (uses the refresh cookie) ----- */
router.post("/refresh", refreshLimiter, refreshController);
router.post("/logout", logoutController);

/* ----- authenticated ----- */
router.get("/me", authenticate, meController);
router.patch("/me", authenticate, updateMeController);
router.post(
    "/change-password",
    authenticate,
    emailActionLimiter,
    changePasswordController
);

export default router;
