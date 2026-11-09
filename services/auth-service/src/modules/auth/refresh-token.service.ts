
import { prisma } from "../../config/database.js";

import {
    generateAccessToken,
    generateRefreshToken,
    hashRefreshToken,
} from "./token.service.js";

import { loadUserAccess } from "./access.service.js";

/**
 * A refresh token that was rotated only moments ago may legitimately be
 * presented again (two browser tabs refreshing at the same time). Within
 * this window it is rejected without revoking the whole session.
 */
const REFRESH_REUSE_GRACE_MS = 10_000;

interface LockedRefreshToken {
    token_id: string;
    session_id: string;
    token_created_at: Date;
    token_expires_at: Date;
    token_revoked_at: Date | null;
    replaced_by_token_id: string | null;
    must_change_password: boolean | null;
    user_id: string;
    session_expires_at: Date;
    session_revoked_at: Date | null;
    user_status: string;
    email_verified_at: Date | null;
    deleted_at: Date | null;
}

interface RefreshSuccess {
    success: true;
    accessToken: string;
    refreshToken: string;
    sessionId: string;
    accessTokenExpiresIn: string;
    refreshTokenExpiresAt: string;
}

type RefreshTransactionResult =
    | { kind: "SUCCESS"; data: RefreshSuccess }
    | { kind: "INVALID" }
    | { kind: "RACE" }
    | { kind: "REUSED" };

export class RefreshTokenError extends Error {
    constructor(
        message: string,
        public readonly code:
            | "INVALID_REFRESH_TOKEN"
            | "REFRESH_TOKEN_REUSED"
            | "REFRESH_TOKEN_RACE"
    ) {
        super(message);
        this.name = "RefreshTokenError";
    }
}

export async function refreshAccessToken(
    rawRefreshToken: string
): Promise<RefreshSuccess> {
    if (
        typeof rawRefreshToken !== "string" ||
        rawRefreshToken.length === 0 ||
        rawRefreshToken.length > 200
    ) {
        throw new RefreshTokenError(
            "Invalid refresh token.",
            "INVALID_REFRESH_TOKEN"
        );
    }

    const tokenHash = hashRefreshToken(rawRefreshToken);

    const result = await prisma.$transaction(
        async (tx): Promise<RefreshTransactionResult> => {
            /*
             * Lock the refresh-token and session rows.
             *
             * This prevents two concurrent requests from successfully
             * rotating the same refresh token.
             */
            const tokens = await tx.$queryRaw<LockedRefreshToken[]>`
                SELECT
                    rt.id AS token_id,
                    rt.session_id,
                    rt.created_at AS token_created_at,
                    rt.expires_at AS token_expires_at,
                    rt.revoked_at AS token_revoked_at,
                    rt.replaced_by_token_id,
                    c.must_change_password,
                    s.user_id,
                    s.expires_at AS session_expires_at,
                    s.revoked_at AS session_revoked_at,
                    u.status AS user_status,
                    u.email_verified_at,
                    u.deleted_at
                FROM auth.refresh_tokens AS rt
                INNER JOIN auth.user_sessions AS s
                    ON s.id = rt.session_id
                INNER JOIN iam.users AS u
                    ON u.id = s.user_id
                LEFT JOIN auth.user_credentials AS c
                    ON c.user_id = u.id
                WHERE rt.token_hash = ${tokenHash}
                FOR UPDATE OF rt, s
            `;

            const existing = tokens[0];

            if (!existing) {
                return { kind: "INVALID" };
            }

            const now = new Date();

            /*
             * A revoked token that is presented again indicates
             * possible refresh-token reuse.
             *
             * Revoke the entire session and its remaining tokens.
             */
            if (existing.token_revoked_at) {
                const rotatedRecently =
                    existing.replaced_by_token_id !== null &&
                    now.getTime() - existing.token_revoked_at.getTime() <
                        REFRESH_REUSE_GRACE_MS &&
                    existing.session_revoked_at === null;

                if (rotatedRecently) {
                    return { kind: "RACE" };
                }

                await tx.user_sessions.update({
                    where: { id: existing.session_id },
                    data: { revoked_at: now },
                });

                await tx.refresh_tokens.updateMany({
                    where: {
                        session_id: existing.session_id,
                        revoked_at: null,
                    },
                    data: { revoked_at: now },
                });

                return { kind: "REUSED" };
            }

            if (
                existing.session_revoked_at ||
                existing.session_expires_at <= now ||
                existing.token_expires_at <= now ||
                existing.user_status !== "ACTIVE" ||
                existing.email_verified_at === null ||
                existing.deleted_at !== null
            ) {
                return { kind: "INVALID" };
            }

            // Keep the lifetime the session was created with
            // (normal or "remember me").
            const lifetimeDays =
                (existing.token_expires_at.getTime() -
                    existing.token_created_at.getTime()) /
                (24 * 60 * 60 * 1000);

            const replacement = generateRefreshToken(lifetimeDays);

            // Generate a new access token for the existing session.
            const access = await loadUserAccess(existing.user_id);
            const accessToken = await generateAccessToken(
                existing.user_id,
                existing.session_id,
                {
                    ...access.claims,
                    mcp: existing.must_change_password === true,
                }
            );

            // Save the new refresh token.
            const newToken = await tx.refresh_tokens.create({
                data: {
                    session_id: existing.session_id,
                    token_hash: replacement.tokenHash,
                    expires_at: replacement.expiresAt,
                },
            });

            // Revoke the previous token and link its replacement.
            await tx.refresh_tokens.update({
                where: { id: existing.token_id },
                data: {
                    revoked_at: now,
                    replaced_by_token_id: newToken.id,
                },
            });

            // Extend the session expiration.
            await tx.user_sessions.update({
                where: { id: existing.session_id },
                data: {
                    expires_at: replacement.expiresAt,
                    last_activity_at: now,
                },
            });

            return {
                kind: "SUCCESS",
                data: {
                    success: true,
                    accessToken,
                    refreshToken: replacement.token,
                    sessionId: existing.session_id,
                    accessTokenExpiresIn:
                        process.env.ACCESS_TOKEN_EXPIRES_IN || "15m",
                    refreshTokenExpiresAt:
                        replacement.expiresAt.toISOString(),
                },
            };
        },
        {
            maxWait: 5000,
            timeout: 10000,
        }
    );

    if (result.kind === "RACE") {
        throw new RefreshTokenError(
            "The refresh token was just rotated. Retry with the new cookie.",
            "REFRESH_TOKEN_RACE"
        );
    }

    if (result.kind === "REUSED") {
        throw new RefreshTokenError(
            "Refresh token reuse detected. The session has been revoked.",
            "REFRESH_TOKEN_REUSED"
        );
    }

    if (result.kind === "INVALID") {
        throw new RefreshTokenError(
            "Invalid or expired refresh token.",
            "INVALID_REFRESH_TOKEN"
        );
    }

    return result.data;
}
