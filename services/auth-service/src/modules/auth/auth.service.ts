import { randomUUID } from "node:crypto";

import { prisma } from "../../config/database.js";

import { hashPassword, verifyPassword } from "./password.service.js";
import { loadUserAccess } from "./access.service.js";

import {
    REFRESH_TOKEN_DAYS,
    REMEMBER_ME_REFRESH_TOKEN_DAYS,
    generateAccessToken,
    generateOpaqueToken,
    generateRefreshToken,
    hashRefreshToken,
} from "./token.service.js";

import {
    sendPasswordChangedEmail,
    sendPasswordResetEmail,
    sendVerificationEmail,
} from "./auth.mail.js";

import type {
    LoginInput,
    RegisterInput,
    UpdateProfileInput,
} from "./auth.schemas.js";

/* ------------------------------------------------------------------ */
/* Configuration                                                       */
/* ------------------------------------------------------------------ */

const MAX_FAILED_LOGINS = Number(
    process.env.LOGIN_MAX_FAILED_ATTEMPTS || 5
);
const LOCK_MINUTES = Number(process.env.LOGIN_LOCK_MINUTES || 15);
const LOCK_WINDOW_MS = LOCK_MINUTES * 60 * 1000;

const EMAIL_VERIFICATION_HOURS = Number(
    process.env.EMAIL_VERIFICATION_EXPIRES_IN_HOURS || 24
);
const PASSWORD_RESET_MINUTES = Number(
    process.env.PASSWORD_RESET_EXPIRES_IN_MINUTES || 60
);
const TOKEN_COOLDOWN_MS = 60 * 1000;

/** Module and role given to every self-registered user. */
const SELF_REGISTRATION_MODULE = "JMS";
const SELF_REGISTRATION_ROLE = "AUTHOR";

const accessTokenExpiresIn =
    process.env.ACCESS_TOKEN_EXPIRES_IN || "15m";

/* ------------------------------------------------------------------ */
/* Errors and small helpers                                            */
/* ------------------------------------------------------------------ */

export class AuthError extends Error {
    constructor(
        message: string,
        public readonly status: number,
        public readonly code: string,
        public readonly extra: Record<string, unknown> = {}
    ) {
        super(message);
        this.name = "AuthError";
    }
}

export interface RequestMetadata {
    ipAddress?: string;
    userAgent?: string;
}

const INVALID_CREDENTIALS_MESSAGE =
    "Invalid email/username or password.";

let dummyHashPromise: Promise<string> | undefined;

/** Used to keep response time similar for unknown accounts. */
function getDummyHash(): Promise<string> {
    dummyHashPromise ??= hashPassword("ora-dummy-password-for-timing");
    return dummyHashPromise;
}

function isUniqueViolation(error: unknown): boolean {
    return (
        typeof error === "object" &&
        error !== null &&
        (error as { code?: string }).code === "P2002"
    );
}

/** SRS: the password must not contain the user's e-mail address. */
export function passwordContainsIdentity(
    password: string,
    email: string,
    username?: string
): boolean {
    const lower = password.toLowerCase();
    const emailLower = email.toLowerCase();
    const localPart = emailLower.split("@")[0] ?? "";

    if (lower.includes(emailLower)) return true;
    if (localPart.length >= 4 && lower.includes(localPart)) return true;
    if (username && username.length >= 4) {
        return lower.includes(username.toLowerCase());
    }
    return false;
}

function assertPasswordAllowed(
    password: string,
    email: string,
    username?: string
): void {
    if (passwordContainsIdentity(password, email, username)) {
        throw new AuthError(
            "Password must not contain your email address or username.",
            422,
            "WEAK_PASSWORD"
        );
    }
}

async function logSecurityEvent(
    userId: string | null,
    eventType: string,
    severity: "INFO" | "WARNING" | "HIGH" | "CRITICAL",
    description: string,
    ipAddress?: string
): Promise<void> {
    try {
        await prisma.security_events.create({
            data: {
                user_id: userId,
                event_type: eventType,
                severity,
                description,
                ip_address: ipAddress,
            },
        });
    } catch (error) {
        console.error("Security event could not be stored:", error);
    }
}

/** Revoke sessions (and their refresh tokens) of a user. */
export async function revokeUserSessions(
    userId: string,
    exceptSessionId?: string
): Promise<void> {
    const now = new Date();
    const sessionFilter = {
        user_id: userId,
        revoked_at: null,
        ...(exceptSessionId ? { id: { not: exceptSessionId } } : {}),
    };

    await prisma.$transaction([
        prisma.refresh_tokens.updateMany({
            where: {
                revoked_at: null,
                user_sessions: { is: sessionFilter },
            },
            data: { revoked_at: now },
        }),
        prisma.user_sessions.updateMany({
            where: sessionFilter,
            data: { revoked_at: now },
        }),
    ]);
}

/* ------------------------------------------------------------------ */
/* Login lockout                                                       */
/* ------------------------------------------------------------------ */

const CREDENTIAL_FAILURE = "INVALID_CREDENTIALS";

async function getLockStatus(
    identifier: string,
    userId?: string
): Promise<{ locked: boolean; retryAfterSeconds: number }> {
    const windowStart = new Date(Date.now() - LOCK_WINDOW_MS);
    const subject = userId
        ? { OR: [{ identifier }, { user_id: userId }] }
        : { identifier };

    const lastSuccess = await prisma.login_attempts.findFirst({
        where: { ...subject, success: true },
        orderBy: { attempted_at: "desc" },
        select: { attempted_at: true },
    });

    const since =
        lastSuccess && lastSuccess.attempted_at > windowStart
            ? lastSuccess.attempted_at
            : windowStart;

    const failures = await prisma.login_attempts.findMany({
        where: {
            ...subject,
            success: false,
            failure_reason: CREDENTIAL_FAILURE,
            attempted_at: { gt: since },
        },
        orderBy: { attempted_at: "desc" },
        take: MAX_FAILED_LOGINS,
        select: { attempted_at: true },
    });

    if (failures.length < MAX_FAILED_LOGINS) {
        return { locked: false, retryAfterSeconds: 0 };
    }

    const unlockAt = failures[0]!.attempted_at.getTime() + LOCK_WINDOW_MS;
    const retryAfterSeconds = Math.ceil((unlockAt - Date.now()) / 1000);

    return {
        locked: retryAfterSeconds > 0,
        retryAfterSeconds: Math.max(retryAfterSeconds, 0),
    };
}

/* ------------------------------------------------------------------ */
/* Login                                                               */
/* ------------------------------------------------------------------ */

export async function login(
    input: LoginInput,
    metadata: RequestMetadata = {}
) {
    const identifier = input.identifier.trim().toLowerCase();

    const user = await prisma.users.findFirst({
        where: {
            deleted_at: null,
            OR: [{ email: identifier }, { username: identifier }],
        },
        include: { user_credentials: true },
    });

    const lock = await getLockStatus(identifier, user?.id);

    if (lock.locked) {
        throw new AuthError(
            `Too many failed sign-in attempts. Try again in ${Math.ceil(
                lock.retryAfterSeconds / 60
            )} minute(s).`,
            429,
            "ACCOUNT_LOCKED",
            { retryAfterSeconds: lock.retryAfterSeconds }
        );
    }

    const record = (success: boolean, reason?: string) =>
        prisma.login_attempts.create({
            data: {
                identifier,
                user_id: user?.id,
                ip_address: metadata.ipAddress,
                user_agent: metadata.userAgent,
                success,
                failure_reason: reason,
            },
        });

    // Always verify against a hash so unknown accounts cost the same.
    const passwordHash =
        user?.user_credentials?.password_hash ?? (await getDummyHash());
    const passwordIsValid = await verifyPassword(
        input.password,
        passwordHash
    );

    if (!user || !user.user_credentials || !passwordIsValid) {
        await record(false, CREDENTIAL_FAILURE);
        throw new AuthError(
            INVALID_CREDENTIALS_MESSAGE,
            401,
            "INVALID_CREDENTIALS"
        );
    }

    // The password is correct, so account state can be revealed safely.
    if (!user.email_verified_at) {
        await record(false, "EMAIL_NOT_VERIFIED");
        throw new AuthError(
            "Please verify your email address before signing in.",
            403,
            "EMAIL_NOT_VERIFIED"
        );
    }

    if (user.status !== "ACTIVE") {
        await record(false, "ACCOUNT_NOT_ACTIVE");
        throw new AuthError(
            "Your account is not active. Please contact the administrator.",
            403,
            "ACCOUNT_NOT_ACTIVE"
        );
    }

    const mustChangePassword = user.user_credentials.must_change_password;
    const access = await loadUserAccess(user.id);

    const sessionId = randomUUID();
    const refresh = generateRefreshToken(
        input.rememberMe
            ? REMEMBER_ME_REFRESH_TOKEN_DAYS
            : REFRESH_TOKEN_DAYS
    );

    const accessToken = await generateAccessToken(user.id, sessionId, {
        ...access.claims,
        mcp: mustChangePassword,
    });

    await prisma.$transaction(async (tx) => {
        await tx.user_sessions.create({
            data: {
                id: sessionId,
                user_id: user.id,
                ip_address: metadata.ipAddress,
                user_agent: metadata.userAgent,
                expires_at: refresh.expiresAt,
            },
        });

        await tx.refresh_tokens.create({
            data: {
                session_id: sessionId,
                token_hash: refresh.tokenHash,
                expires_at: refresh.expiresAt,
            },
        });

        await tx.users.update({
            where: { id: user.id },
            data: { last_login_at: new Date() },
        });

        await tx.login_attempts.create({
            data: {
                user_id: user.id,
                identifier,
                ip_address: metadata.ipAddress,
                user_agent: metadata.userAgent,
                success: true,
            },
        });
    });

    return {
        user: {
            id: user.id,
            firstName: user.first_name,
            lastName: user.last_name,
            username: user.username,
            email: user.email,
            mustChangePassword,
            roles: access.claims.roles,
            isSuperAdmin: access.isSuperAdmin,
        },
        sessionId,
        accessToken,
        refreshToken: refresh.token,
        accessTokenExpiresIn,
        refreshTokenExpiresAt: refresh.expiresAt.toISOString(),
        refreshTokenLifetimeMs:
            refresh.expiresAt.getTime() - Date.now(),
    };
}

/* ------------------------------------------------------------------ */
/* Logout                                                              */
/* ------------------------------------------------------------------ */

export async function logout(params: {
    refreshToken?: string;
    sessionId?: string;
}): Promise<void> {
    let sessionId = params.sessionId;

    if (!sessionId && params.refreshToken) {
        const token = await prisma.refresh_tokens.findUnique({
            where: { token_hash: hashRefreshToken(params.refreshToken) },
            select: { session_id: true },
        });
        sessionId = token?.session_id;
    }

    if (!sessionId) return;

    const now = new Date();

    await prisma.$transaction([
        prisma.refresh_tokens.updateMany({
            where: { session_id: sessionId, revoked_at: null },
            data: { revoked_at: now },
        }),
        prisma.user_sessions.updateMany({
            where: { id: sessionId, revoked_at: null },
            data: { revoked_at: now },
        }),
    ]);
}

/* ------------------------------------------------------------------ */
/* Self-registration and e-mail verification                           */
/* ------------------------------------------------------------------ */

async function issueVerificationToken(
    userId: string
): Promise<string> {
    const { token, tokenHash } = generateOpaqueToken();

    await prisma.$transaction([
        prisma.email_verification_tokens.deleteMany({
            where: { user_id: userId, verified_at: null },
        }),
        prisma.email_verification_tokens.create({
            data: {
                user_id: userId,
                token_hash: tokenHash,
                expires_at: new Date(
                    Date.now() + EMAIL_VERIFICATION_HOURS * 3600 * 1000
                ),
            },
        }),
    ]);

    return token;
}

export async function register(
    input: RegisterInput,
    metadata: RequestMetadata = {}
) {
    const existing = await prisma.users.findFirst({
        where: {
            deleted_at: null,
            OR: [{ email: input.email }, { username: input.username }],
        },
        select: { email: true, username: true },
    });

    if (existing?.email === input.email) {
        throw new AuthError(
            "This email address is already registered.",
            409,
            "EMAIL_ALREADY_EXISTS"
        );
    }

    if (existing?.username === input.username) {
        throw new AuthError(
            "This username is already taken.",
            409,
            "USERNAME_ALREADY_EXISTS"
        );
    }

    assertPasswordAllowed(input.password, input.email, input.username);

    const module = await prisma.modules.findFirst({
        where: { code: SELF_REGISTRATION_MODULE, is_active: true },
        select: { id: true },
    });

    const role = module
        ? await prisma.roles.findFirst({
              where: {
                  module_id: module.id,
                  code: SELF_REGISTRATION_ROLE,
                  scope: "MODULE",
                  is_active: true,
              },
              select: { id: true },
          })
        : null;

    if (!module || !role) {
        console.error(
            `Self-registration is not configured: ${SELF_REGISTRATION_MODULE}/${SELF_REGISTRATION_ROLE} role is missing.`
        );
        throw new AuthError(
            "Registration is temporarily unavailable.",
            503,
            "REGISTRATION_UNAVAILABLE"
        );
    }

    const passwordHash = await hashPassword(input.password);
    const { token, tokenHash } = generateOpaqueToken();

    let user;
    try {
        user = await prisma.$transaction(async (tx) => {
            const created = await tx.users.create({
                data: {
                    first_name: input.first_name,
                    last_name: input.last_name,
                    username: input.username,
                    email: input.email,
                    status: "PENDING",
                },
                select: {
                    id: true,
                    first_name: true,
                    last_name: true,
                    username: true,
                    email: true,
                },
            });

            await tx.user_credentials.create({
                data: {
                    user_id: created.id,
                    password_hash: passwordHash,
                    must_change_password: false,
                    password_changed_at: new Date(),
                },
            });

            await tx.user_profiles.create({
                data: { user_id: created.id },
            });

            const assignment = await tx.user_module_assignments.create({
                data: {
                    user_id: created.id,
                    module_id: module.id,
                    status: "ACTIVE",
                },
                select: { id: true },
            });

            await tx.user_module_roles.create({
                data: {
                    module_assignment_id: assignment.id,
                    module_id: module.id,
                    role_id: role.id,
                },
            });

            await tx.email_verification_tokens.create({
                data: {
                    user_id: created.id,
                    token_hash: tokenHash,
                    expires_at: new Date(
                        Date.now() +
                            EMAIL_VERIFICATION_HOURS * 3600 * 1000
                    ),
                },
            });

            return created;
        });
    } catch (error) {
        if (isUniqueViolation(error)) {
            throw new AuthError(
                "This email address or username is already registered.",
                409,
                "ALREADY_EXISTS"
            );
        }
        throw error;
    }

    const emailSent = await sendVerificationEmail(
        user.email,
        user.first_name,
        token,
        EMAIL_VERIFICATION_HOURS
    );

    await logSecurityEvent(
        user.id,
        "USER_REGISTERED",
        "INFO",
        "User self-registered.",
        metadata.ipAddress
    );

    return {
        user: {
            id: user.id,
            firstName: user.first_name,
            lastName: user.last_name,
            username: user.username,
            email: user.email,
        },
        emailSent,
    };
}

export async function verifyEmail(token: string) {
    const record = await prisma.email_verification_tokens.findUnique({
        where: { token_hash: hashRefreshToken(token) },
        include: { users: true },
    });

    if (!record || record.users.deleted_at) {
        throw new AuthError(
            "This verification link is invalid.",
            400,
            "INVALID_VERIFICATION_TOKEN"
        );
    }

    if (record.verified_at || record.users.email_verified_at) {
        return { alreadyVerified: true };
    }

    if (record.expires_at <= new Date()) {
        throw new AuthError(
            "This verification link has expired. Request a new one.",
            400,
            "VERIFICATION_TOKEN_EXPIRED"
        );
    }

    const now = new Date();

    await prisma.$transaction(async (tx) => {
        await tx.email_verification_tokens.update({
            where: { id: record.id },
            data: { verified_at: now },
        });

        await tx.users.update({
            where: { id: record.user_id },
            data: {
                email_verified_at: now,
                // Only a pending account is activated; a suspended or
                // disabled account must stay that way.
                ...(record.users.status === "PENDING"
                    ? { status: "ACTIVE" }
                    : {}),
            },
        });
    });

    return { alreadyVerified: false };
}

/** Always succeeds from the caller's point of view (no enumeration). */
export async function resendVerification(email: string): Promise<void> {
    const user = await prisma.users.findFirst({
        where: {
            email,
            deleted_at: null,
            email_verified_at: null,
            status: "PENDING",
        },
        select: { id: true, email: true, first_name: true },
    });

    if (!user) return;

    const latest = await prisma.email_verification_tokens.findFirst({
        where: { user_id: user.id },
        orderBy: { created_at: "desc" },
        select: { created_at: true },
    });

    if (
        latest &&
        Date.now() - latest.created_at.getTime() < TOKEN_COOLDOWN_MS
    ) {
        return;
    }

    const token = await issueVerificationToken(user.id);

    await sendVerificationEmail(
        user.email,
        user.first_name,
        token,
        EMAIL_VERIFICATION_HOURS
    );
}

/* ------------------------------------------------------------------ */
/* Forgot / reset / change password                                    */
/* ------------------------------------------------------------------ */

/** Always succeeds from the caller's point of view (no enumeration). */
export async function forgotPassword(
    email: string,
    metadata: RequestMetadata = {}
): Promise<void> {
    const user = await prisma.users.findFirst({
        where: {
            email,
            deleted_at: null,
            status: "ACTIVE",
            email_verified_at: { not: null },
        },
        select: { id: true, email: true, first_name: true },
    });

    if (!user) return;

    const latest = await prisma.password_reset_tokens.findFirst({
        where: { user_id: user.id },
        orderBy: { created_at: "desc" },
        select: { created_at: true },
    });

    if (
        latest &&
        Date.now() - latest.created_at.getTime() < TOKEN_COOLDOWN_MS
    ) {
        return;
    }

    const { token, tokenHash } = generateOpaqueToken();

    await prisma.$transaction([
        prisma.password_reset_tokens.updateMany({
            where: { user_id: user.id, used_at: null },
            data: { used_at: new Date() },
        }),
        prisma.password_reset_tokens.create({
            data: {
                user_id: user.id,
                token_hash: tokenHash,
                expires_at: new Date(
                    Date.now() + PASSWORD_RESET_MINUTES * 60 * 1000
                ),
            },
        }),
    ]);

    await sendPasswordResetEmail(
        user.email,
        user.first_name,
        token,
        PASSWORD_RESET_MINUTES
    );

    await logSecurityEvent(
        user.id,
        "PASSWORD_RESET_REQUESTED",
        "INFO",
        "Password reset requested.",
        metadata.ipAddress
    );
}

export async function resetPassword(
    token: string,
    newPassword: string,
    metadata: RequestMetadata = {}
): Promise<void> {
    const record = await prisma.password_reset_tokens.findUnique({
        where: { token_hash: hashRefreshToken(token) },
        include: { users: true },
    });

    const invalid = () =>
        new AuthError(
            "This password reset link is invalid or has expired.",
            400,
            "INVALID_RESET_TOKEN"
        );

    if (
        !record ||
        record.used_at ||
        record.expires_at <= new Date() ||
        record.users.deleted_at ||
        record.users.status !== "ACTIVE"
    ) {
        throw invalid();
    }

    assertPasswordAllowed(
        newPassword,
        record.users.email,
        record.users.username
    );

    const passwordHash = await hashPassword(newPassword);
    const now = new Date();

    await prisma.$transaction(async (tx) => {
        // Claim the token atomically so it can only be used once.
        const claimed = await tx.password_reset_tokens.updateMany({
            where: { id: record.id, used_at: null },
            data: { used_at: now },
        });

        if (claimed.count !== 1) throw invalid();

        await tx.user_credentials.update({
            where: { user_id: record.user_id },
            data: {
                password_hash: passwordHash,
                password_changed_at: now,
                must_change_password: false,
                updated_at: now,
            },
        });

        // A successful reset also clears the failed-login counter.
        await tx.login_attempts.updateMany({
            where: {
                user_id: record.user_id,
                failure_reason: CREDENTIAL_FAILURE,
                attempted_at: { gt: new Date(Date.now() - LOCK_WINDOW_MS) },
            },
            data: { failure_reason: "CLEARED_BY_RESET" },
        });
    });

    await revokeUserSessions(record.user_id);

    await logSecurityEvent(
        record.user_id,
        "PASSWORD_RESET_COMPLETED",
        "WARNING",
        "Password was reset using an email link; all sessions revoked.",
        metadata.ipAddress
    );

    await sendPasswordChangedEmail(
        record.users.email,
        record.users.first_name
    );
}

export async function changePassword(
    auth: { id: string; sessionId: string },
    currentPassword: string,
    newPassword: string,
    metadata: RequestMetadata = {}
) {
    const user = await prisma.users.findUnique({
        where: { id: auth.id },
        include: { user_credentials: true },
    });

    if (!user || !user.user_credentials) {
        throw new AuthError("Account not found.", 404, "USER_NOT_FOUND");
    }

    const currentIsValid = await verifyPassword(
        currentPassword,
        user.user_credentials.password_hash
    );

    if (!currentIsValid) {
        throw new AuthError(
            "Your current password is incorrect.",
            400,
            "INVALID_CURRENT_PASSWORD"
        );
    }

    if (currentPassword === newPassword) {
        throw new AuthError(
            "The new password must be different from the current one.",
            422,
            "PASSWORD_UNCHANGED"
        );
    }

    assertPasswordAllowed(newPassword, user.email, user.username);

    const now = new Date();

    await prisma.user_credentials.update({
        where: { user_id: user.id },
        data: {
            password_hash: await hashPassword(newPassword),
            password_changed_at: now,
            must_change_password: false,
            updated_at: now,
        },
    });

    // Sign out every other device; keep the current one.
    await revokeUserSessions(user.id, auth.sessionId);

    await logSecurityEvent(
        user.id,
        "PASSWORD_CHANGED",
        "INFO",
        "Password changed by the user.",
        metadata.ipAddress
    );

    await sendPasswordChangedEmail(user.email, user.first_name);

    // The old token still carries mcp=true, so issue a fresh one.
    const access = await loadUserAccess(user.id);
    const accessToken = await generateAccessToken(
        user.id,
        auth.sessionId,
        { ...access.claims, mcp: false }
    );

    return { accessToken, accessTokenExpiresIn };
}

/* ------------------------------------------------------------------ */
/* Current user                                                        */
/* ------------------------------------------------------------------ */

export async function getMe(userId: string) {
    const user = await prisma.users.findFirst({
        where: { id: userId, deleted_at: null },
        include: { user_credentials: true, user_profiles: true },
    });

    if (!user) {
        throw new AuthError("Account not found.", 404, "USER_NOT_FOUND");
    }

    const access = await loadUserAccess(user.id);

    return {
        id: user.id,
        firstName: user.first_name,
        lastName: user.last_name,
        username: user.username,
        email: user.email,
        status: user.status,
        emailVerifiedAt: user.email_verified_at,
        lastLoginAt: user.last_login_at,
        createdAt: user.created_at,
        mustChangePassword:
            user.user_credentials?.must_change_password ?? false,
        profile: {
            jobTitle: user.user_profiles?.job_title ?? null,
            organization: user.user_profiles?.organization ?? null,
            bio: user.user_profiles?.bio ?? null,
            photoUrl: user.user_profiles?.profile_photo_url ?? null,
        },
        isSuperAdmin: access.isSuperAdmin,
        systemRoles: access.systemRoles,
        modules: access.modules,
        permissions: access.permissions,
    };
}

export async function updateMe(
    userId: string,
    input: UpdateProfileInput
) {
    await prisma.$transaction(async (tx) => {
        if (input.first_name || input.last_name) {
            await tx.users.update({
                where: { id: userId },
                data: {
                    ...(input.first_name
                        ? { first_name: input.first_name }
                        : {}),
                    ...(input.last_name
                        ? { last_name: input.last_name }
                        : {}),
                    updated_at: new Date(),
                },
            });
        }

        const profileData = {
            ...(input.job_title !== undefined
                ? { job_title: input.job_title || null }
                : {}),
            ...(input.organization !== undefined
                ? { organization: input.organization || null }
                : {}),
            ...(input.bio !== undefined ? { bio: input.bio || null } : {}),
        };

        if (Object.keys(profileData).length > 0) {
            await tx.user_profiles.upsert({
                where: { user_id: userId },
                create: { user_id: userId, ...profileData },
                update: { ...profileData, updated_at: new Date() },
            });
        }
    });

    return getMe(userId);
}
