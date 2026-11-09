import type { NextFunction, Request, Response } from "express";
import type { ZodType } from "zod";

import {
    changePasswordSchema,
    forgotPasswordSchema,
    loginSchema,
    registerSchema,
    resendVerificationSchema,
    resetPasswordSchema,
    updateProfileSchema,
    verifyEmailSchema,
} from "./auth.schemas.js";

import {
    AuthError,
    changePassword,
    forgotPassword,
    getMe,
    login,
    logout,
    register,
    resendVerification,
    resetPassword,
    updateMe,
    verifyEmail,
} from "./auth.service.js";

import {
    RefreshTokenError,
    refreshAccessToken,
} from "./refresh-token.service.js";

const REFRESH_COOKIE = "ora_refresh_token";
const isProduction = process.env.NODE_ENV === "production";
// Secure cookies need HTTPS. Set COOKIE_SECURE=false to test a production
// build over plain http (e.g. a test server reached by IP address).
const cookieSecure = process.env.COOKIE_SECURE
    ? process.env.COOKIE_SECURE === "true"
    : isProduction;

const cookieOptions = {
    httpOnly: true,
    secure: cookieSecure,
    sameSite: "lax" as const,
    path: "/api/v1/auth",
};

function setRefreshCookie(
    res: Response,
    token: string,
    maxAgeMs: number
): void {
    res.cookie(REFRESH_COOKIE, token, {
        ...cookieOptions,
        maxAge: maxAgeMs,
    });
}

function clearRefreshCookie(res: Response): void {
    res.clearCookie(REFRESH_COOKIE, cookieOptions);
}

function metadata(req: Request) {
    return {
        ipAddress: req.ip,
        userAgent: req.get("user-agent") || undefined,
    };
}

/** Validate req.body; respond 400 with field errors when invalid. */
function parseBody<T>(
    schema: ZodType<T>,
    req: Request,
    res: Response,
    message = "Please check the submitted information."
): T | undefined {
    const result = schema.safeParse(req.body);

    if (!result.success) {
        res.status(400).json({
            success: false,
            message,
            errors: result.error.flatten().fieldErrors,
        });
        return undefined;
    }

    return result.data;
}

/** Wrap async handlers and translate AuthError into JSON responses. */
function handler(
    fn: (req: Request, res: Response) => Promise<unknown>
) {
    return async (req: Request, res: Response, _next: NextFunction) => {
        try {
            await fn(req, res);
        } catch (error) {
            if (error instanceof AuthError) {
                if (error.extra.retryAfterSeconds) {
                    res.setHeader(
                        "Retry-After",
                        String(error.extra.retryAfterSeconds)
                    );
                }
                res.status(error.status).json({
                    success: false,
                    message: error.message,
                    code: error.code,
                    ...error.extra,
                });
                return;
            }

            console.error(`Auth controller error (${req.path}):`, error);
            res.status(500).json({
                success: false,
                message: "An internal authentication error occurred.",
            });
        }
    };
}

/* ------------------------------------------------------------------ */

export const loginController = handler(async (req, res) => {
    const input = parseBody(
        loginSchema,
        req,
        res,
        "Invalid login information."
    );
    if (!input) return;

    const result = await login(input, metadata(req));

    setRefreshCookie(
        res,
        result.refreshToken,
        result.refreshTokenLifetimeMs
    );

    res.status(200).json({
        success: true,
        message: "Login successful.",
        data: {
            user: result.user,
            sessionId: result.sessionId,
            accessToken: result.accessToken,
            tokenType: "Bearer",
            accessTokenExpiresIn: result.accessTokenExpiresIn,
            refreshTokenExpiresAt: result.refreshTokenExpiresAt,
        },
    });
});

export const registerController = handler(async (req, res) => {
    const input = parseBody(registerSchema, req, res);
    if (!input) return;

    const result = await register(input, metadata(req));

    res.status(201).json({
        success: true,
        message:
            "Registration successful. Please check your email to verify your account.",
        data: { user: result.user, emailSent: result.emailSent },
    });
});

export const verifyEmailController = handler(async (req, res) => {
    const input = parseBody(verifyEmailSchema, req, res);
    if (!input) return;

    const result = await verifyEmail(input.token);

    res.status(200).json({
        success: true,
        message: result.alreadyVerified
            ? "Your email address was already verified."
            : "Email verified. You can now sign in.",
        data: result,
    });
});

export const resendVerificationController = handler(
    async (req, res) => {
        const input = parseBody(resendVerificationSchema, req, res);
        if (!input) return;

        await resendVerification(input.email);

        res.status(200).json({
            success: true,
            message:
                "If the account exists and is not yet verified, a new verification email has been sent.",
        });
    }
);

export const forgotPasswordController = handler(async (req, res) => {
    const input = parseBody(forgotPasswordSchema, req, res);
    if (!input) return;

    await forgotPassword(input.email, metadata(req));

    res.status(200).json({
        success: true,
        message:
            "If an account with that email exists, a password reset link has been sent.",
    });
});

export const resetPasswordController = handler(async (req, res) => {
    const input = parseBody(resetPasswordSchema, req, res);
    if (!input) return;

    await resetPassword(input.token, input.password, metadata(req));
    clearRefreshCookie(res);

    res.status(200).json({
        success: true,
        message:
            "Your password has been reset. Please sign in with your new password.",
    });
});

export const refreshController = async (
    req: Request,
    res: Response
): Promise<void> => {
    const rawToken = req.cookies?.[REFRESH_COOKIE];

    if (!rawToken) {
        res.status(401).json({
            success: false,
            message: "No active session.",
            code: "NO_REFRESH_TOKEN",
        });
        return;
    }

    try {
        const result = await refreshAccessToken(rawToken);

        setRefreshCookie(
            res,
            result.refreshToken,
            new Date(result.refreshTokenExpiresAt).getTime() - Date.now()
        );

        res.status(200).json({
            success: true,
            data: {
                accessToken: result.accessToken,
                tokenType: "Bearer",
                accessTokenExpiresIn: result.accessTokenExpiresIn,
                sessionId: result.sessionId,
                refreshTokenExpiresAt: result.refreshTokenExpiresAt,
            },
        });
    } catch (error) {
        if (error instanceof RefreshTokenError) {
            // A concurrent rotation: keep the cookie, let the client retry.
            if (error.code !== "REFRESH_TOKEN_RACE") {
                clearRefreshCookie(res);
            }
            res.status(401).json({
                success: false,
                message: error.message,
                code: error.code,
            });
            return;
        }

        console.error("Refresh controller error:", error);
        res.status(500).json({
            success: false,
            message: "An internal authentication error occurred.",
        });
    }
};

export const logoutController = async (
    req: Request,
    res: Response
): Promise<void> => {
    try {
        await logout({ refreshToken: req.cookies?.[REFRESH_COOKIE] });
    } catch (error) {
        console.error("Logout error:", error);
    }

    // Logging out is always successful for the client.
    clearRefreshCookie(res);
    res.status(200).json({ success: true, message: "Signed out." });
};

export const meController = handler(async (req, res) => {
    const user = await getMe(req.auth!.id);
    res.status(200).json({ success: true, data: { user } });
});

export const updateMeController = handler(async (req, res) => {
    const input = parseBody(updateProfileSchema, req, res);
    if (!input) return;

    const user = await updateMe(req.auth!.id, input);
    res.status(200).json({
        success: true,
        message: "Your profile has been updated.",
        data: { user },
    });
});

export const changePasswordController = handler(async (req, res) => {
    const input = parseBody(changePasswordSchema, req, res);
    if (!input) return;

    const result = await changePassword(
        { id: req.auth!.id, sessionId: req.auth!.sessionId },
        input.current_password,
        input.new_password,
        metadata(req)
    );

    res.status(200).json({
        success: true,
        message: "Your password has been changed.",
        data: {
            accessToken: result.accessToken,
            tokenType: "Bearer",
            accessTokenExpiresIn: result.accessTokenExpiresIn,
        },
    });
});
