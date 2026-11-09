import { z } from "zod";

/* ---------- shared field rules ---------- */

/**
 * Password policy (SRS UC-SYS-01): at least 8 characters containing
 * upper case, lower case, a number and a special character.
 */
export const passwordSchema = z
    .string()
    .min(8, "Password must contain at least 8 characters.")
    .max(128, "Password cannot exceed 128 characters.")
    .regex(/[a-z]/, "Password must contain a lowercase letter.")
    .regex(/[A-Z]/, "Password must contain an uppercase letter.")
    .regex(/[0-9]/, "Password must contain a number.")
    .regex(
        /[^A-Za-z0-9]/,
        "Password must contain a special character."
    );

const emailSchema = z
    .string()
    .trim()
    .email("Enter a valid email address.")
    .max(255)
    .transform((value) => value.toLowerCase());

const usernameSchema = z
    .string()
    .trim()
    .min(3, "Username must contain at least 3 characters.")
    .max(100)
    .regex(
        /^[a-zA-Z0-9._-]+$/,
        "Username can only contain letters, numbers, dots, underscores, and hyphens."
    )
    .transform((value) => value.toLowerCase());

const nameSchema = (label: string) =>
    z
        .string()
        .trim()
        .min(2, `${label} must contain at least 2 characters.`)
        .max(100, `${label} cannot exceed 100 characters.`);

const tokenSchema = z
    .string()
    .trim()
    .min(20, "Invalid token.")
    .max(200, "Invalid token.");

/* ---------- request schemas ---------- */

export const loginSchema = z.object({
    identifier: z
        .string()
        .trim()
        .min(1, "Email or username is required.")
        .max(255, "Email or username is too long."),

    password: z
        .string()
        .min(1, "Password is required.")
        .max(128, "Password is too long."),

    rememberMe: z.boolean().optional().default(false),
});

export const registerSchema = z.object({
    first_name: nameSchema("First name"),
    last_name: nameSchema("Last name"),
    email: emailSchema,
    username: usernameSchema,
    password: passwordSchema,
});

export const verifyEmailSchema = z.object({ token: tokenSchema });

export const resendVerificationSchema = z.object({
    email: emailSchema,
});

export const forgotPasswordSchema = z.object({ email: emailSchema });

export const resetPasswordSchema = z.object({
    token: tokenSchema,
    password: passwordSchema,
});

export const changePasswordSchema = z.object({
    current_password: z.string().min(1, "Current password is required.").max(128),
    new_password: passwordSchema,
});

export const updateProfileSchema = z
    .object({
        first_name: nameSchema("First name").optional(),
        last_name: nameSchema("Last name").optional(),
        job_title: z.string().trim().max(150).nullable().optional(),
        organization: z.string().trim().max(200).nullable().optional(),
        bio: z.string().trim().max(2000).nullable().optional(),
    })
    .refine((value) => Object.keys(value).length > 0, {
        message: "Provide at least one field to update.",
    });

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
