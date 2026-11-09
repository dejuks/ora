
import { z } from "zod";

import { passwordSchema } from "../auth/auth.schemas.js";

const moduleCodes = [
  "JMS",
  "EBOOK",
  "LMS",
  "REPOSITORY",
  "WIKI",
  "RNP",
] as const;

export const createUserSchema = z
  .object({
    first_name: z
      .string()
      .trim()
      .min(2, "First name must contain at least 2 characters.")
      .max(100, "First name cannot exceed 100 characters."),

    last_name: z
      .string()
      .trim()
      .min(2, "Last name must contain at least 2 characters.")
      .max(100, "Last name cannot exceed 100 characters."),

    email: z
      .string()
      .trim()
      .email("Enter a valid email address.")
      .max(255)
      .transform((value) => value.toLowerCase()),

    username: z
      .string()
      .trim()
      .min(3, "Username must contain at least 3 characters.")
      .max(100)
      .regex(
        /^[a-zA-Z0-9._-]+$/,
        "Username can only contain letters, numbers, dots, underscores, and hyphens."
      )
      .transform((value) => value.toLowerCase()),

    // Temporary password. Same policy as self-registration (SRS UC-SYS-01).
    password: passwordSchema,

    module_code: z.enum(moduleCodes, {
      message: "Select a valid ORA module.",
    }),

    role_id: z
      .string()
      .uuid("Select a valid module role."),

    branch_id: z
      .string()
      .uuid("Select a valid library branch.")
      .nullable()
      .optional(),
  })
  .superRefine((data, ctx) => {
    if (data.module_code === "LMS" && !data.branch_id) {
      ctx.addIssue({
        code: "custom",
        path: ["branch_id"],
        message: "A library branch is required for LMS users.",
      });
    }

    if (data.module_code !== "LMS" && data.branch_id) {
      ctx.addIssue({
        code: "custom",
        path: ["branch_id"],
        message: "Library branches can only be assigned to LMS users.",
      });
    }
  });

export type CreateUserInput = z.infer<typeof createUserSchema>;

export const listUsersSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(100).optional(),
  status: z
    .enum(["PENDING", "ACTIVE", "SUSPENDED", "DISABLED"])
    .optional(),
  module_code: z.enum(moduleCodes).optional(),
  role_code: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9_]{2,50}$/, "Invalid role code.")
    .optional(),
});

export const userIdSchema = z.object({
  id: z.string().uuid("Invalid user id."),
});

export const updateUserStatusSchema = z.object({
  status: z.enum(["ACTIVE", "SUSPENDED"], {
    message: "Status must be ACTIVE or SUSPENDED.",
  }),
});

export type ListUsersInput = z.infer<typeof listUsersSchema>;
