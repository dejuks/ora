import { SignJWT } from "jose";
import { createHash, randomBytes } from "node:crypto";

const ACCESS_TOKEN_LIFETIME =
    process.env.ACCESS_TOKEN_EXPIRES_IN || "15m";

function readDays(name: string, fallback: number): number {
    const value = Number(process.env[name] || fallback);

    if (!Number.isInteger(value) || value < 1) {
        throw new Error(`Invalid ${name} configuration.`);
    }

    return value;
}

/** Normal session lifetime (SRS: refresh token valid for 7 days). */
export const REFRESH_TOKEN_DAYS = readDays(
    "REFRESH_TOKEN_EXPIRES_IN_DAYS",
    7
);

/** Extended session lifetime used when "Remember me" is selected. */
export const REMEMBER_ME_REFRESH_TOKEN_DAYS = readDays(
    "REMEMBER_ME_REFRESH_TOKEN_EXPIRES_IN_DAYS",
    30
);

/**
 * Claims embedded in the access token so that other ORA
 * microservices can authorize a request without calling this service.
 *
 *  - roles   : system role codes, e.g. ["SUPER_ADMIN"]
 *  - modules : module role codes per module, e.g. { JMS: ["AUTHOR"] }
 *  - mcp     : true when the user must change the password first
 */
export interface AccessClaims {
    roles: string[];
    modules: Record<string, string[]>;
    mcp: boolean;
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

export async function generateAccessToken(
    userId: string,
    sessionId: string,
    claims: AccessClaims = { roles: [], modules: {}, mcp: false }
): Promise<string> {
    const secret = getAccessTokenSecret();

    return new SignJWT({
        sid: sessionId,
        roles: claims.roles,
        modules: claims.modules,
        mcp: claims.mcp,
    })
        .setProtectedHeader({ alg: "HS256" })
        .setSubject(userId)
        .setIssuedAt()
        .setIssuer("ora-auth-service")
        .setAudience("ora-digital-platform")
        .setExpirationTime(ACCESS_TOKEN_LIFETIME)
        .sign(secret);
}

export function hashRefreshToken(token: string): string {
    return createHash("sha256").update(token).digest("hex");
}

export function generateRefreshToken(
    lifetimeDays: number = REFRESH_TOKEN_DAYS
): {
    token: string;
    tokenHash: string;
    expiresAt: Date;
} {
    const token = randomBytes(64).toString("base64url");

    return {
        token,
        tokenHash: hashRefreshToken(token),
        expiresAt: new Date(
            Date.now() + lifetimeDays * 24 * 60 * 60 * 1000
        ),
    };
}

/**
 * Single-use token for e-mail verification and password reset.
 * Only the SHA-256 hash is stored in the database.
 */
export function generateOpaqueToken(): {
    token: string;
    tokenHash: string;
} {
    const token = randomBytes(32).toString("base64url");

    return { token, tokenHash: hashRefreshToken(token) };
}
