
import type {
  Request,
  Response,
  NextFunction,
} from "express";

import { jwtVerify } from "jose";

import { prisma } from "../config/database.js";

interface AuthenticatedUser {
  id: string;
  sessionId: string;
  email: string;
  username: string;
  mustChangePassword: boolean;
}

declare global {
  namespace Express {
    interface Request {
      auth?: AuthenticatedUser;
    }
  }
}

function getAccessTokenSecret(): Uint8Array {
  const secret = process.env.ACCESS_TOKEN_SECRET;

  if (!secret || secret.length < 32) {
    throw new Error(
      "ACCESS_TOKEN_SECRET must contain at least 32 characters."
    );
  }

  return new TextEncoder().encode(secret);
}

export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // 1. Read Authorization header.
    const authorization = req.headers.authorization;

    if (!authorization?.startsWith("Bearer ")) {
      res.status(401).json({
        success: false,
        message: "Authentication is required.",
      });
      return;
    }

    const accessToken = authorization.slice(7).trim();

    if (!accessToken) {
      res.status(401).json({
        success: false,
        message: "Access token is missing.",
      });
      return;
    }

    // 2. Verify JWT signature and claims.
    const { payload } = await jwtVerify(
      accessToken,
      getAccessTokenSecret(),
      {
        issuer: "ora-auth-service",
        audience: "ora-digital-platform",
        algorithms: ["HS256"],
      }
    );

    const userId = payload.sub;
    const sessionId = payload.sid;

    if (
      typeof userId !== "string" ||
      typeof sessionId !== "string"
    ) {
      res.status(401).json({
        success: false,
        message: "Invalid access token.",
      });
      return;
    }

    // 3. Verify the session and associated user.
    const session = await prisma.user_sessions.findFirst({
      where: {
        id: sessionId,
        user_id: userId,
        revoked_at: null,
        expires_at: {
          gt: new Date(),
        },
        users: {
          is: {
            status: "ACTIVE",
            deleted_at: null,
          },
        },
      },
      select: {
        id: true,
        user_id: true,
        users: {
          select: {
            id: true,
            email: true,
            username: true,
            user_credentials: {
              select: { must_change_password: true },
            },
          },
        },
      },
    });

    if (!session || !session.users) {
      res.status(401).json({
        success: false,
        message: "Your session is invalid or expired.",
      });
      return;
    }

    // 4. Attach authenticated identity to Express request.
    req.auth = {
      id: session.users.id,
      sessionId: session.id,
      email: session.users.email,
      username: session.users.username,
      mustChangePassword:
        session.users.user_credentials?.must_change_password ?? false,
    };

    next();
  } catch (error) {
    if (
      error instanceof Error &&
      (
        error.name === "JWTExpired" ||
        error.name === "JWSSignatureVerificationFailed" ||
        error.name === "JWTClaimValidationFailed" ||
        error.name === "JWSInvalid" ||
        error.name === "JWTInvalid"
      )
    ) {
      res.status(401).json({
        success: false,
        message: "Invalid or expired access token.",
      });
      return;
    }

    console.error("Authentication middleware error:", error);

    res.status(500).json({
      success: false,
      message: "An authentication error occurred.",
    });
  }
}

/**
 * Block access to protected resources until a user who was given a
 * temporary password has chosen their own. /auth/me, /auth/change-password
 * and /auth/logout stay reachable because they do not use this guard.
 *
 * authenticate must run before this middleware.
 */
export function requirePasswordChanged(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (req.auth?.mustChangePassword) {
    res.status(403).json({
      success: false,
      message: "You must change your temporary password before continuing.",
      code: "PASSWORD_CHANGE_REQUIRED",
    });
    return;
  }

  next();
}
