import argon2 from "argon2";

const ARGON2_OPTIONS = {
    type: argon2.argon2id,
    memoryCost: 19456,
    timeCost: 2,
    parallelism: 1,
} as const;

export async function hashPassword(password: string): Promise<string> {
    if (typeof password !== "string" || password.length === 0) {
        throw new Error("Password is required.");
    }

    return argon2.hash(password, ARGON2_OPTIONS);
}

export async function verifyPassword(
    password: string,
    passwordHash: string
): Promise<boolean> {
    if (
        typeof password !== "string" ||
        typeof passwordHash !== "string" ||
        password.length === 0 ||
        passwordHash.length === 0
    ) {
        return false;
    }

    try {
        return await argon2.verify(passwordHash, password);
    } catch {
        return false;
    }
}