
import { z } from "zod";

const permissionIdSchema = z.string().uuid();

export const roleListSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().optional(),
  module_code: z
    .enum(["JMS", "EBOOK", "LMS", "REPOSITORY", "WIKI", "RNP"])
    .optional(),
  scope: z.enum(["SYSTEM", "MODULE"]).optional(),
});

export const roleIdSchema = z.object({
  id: z.string().uuid(),
});

export const createRoleSchema = z.object({
  name: z.string().trim().min(2).max(100),
  code: z
    .string()
    .trim()
    .min(2)
    .max(100)
    .regex(/^[A-Z0-9_]+$/, "Code must contain uppercase letters, numbers, and underscores."),
  scope: z.enum(["SYSTEM", "MODULE"]),
  module_code: z
    .enum(["JMS", "EBOOK", "LMS", "REPOSITORY", "WIKI", "RNP"])
    .nullable()
    .optional(),
  description: z.string().trim().max(1000).nullable().optional(),
  permission_ids: z.array(permissionIdSchema).default([]),
});

export const updateRoleSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  description: z.string().trim().max(1000).nullable().optional(),
  is_active: z.boolean().optional(),
}).refine(
  (data) => Object.keys(data).length > 0,
  { message: "At least one field must be provided." }
);

export const replaceRolePermissionsSchema = z.object({
  permission_ids: z.array(permissionIdSchema),
});

export const permissionListSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().optional(),
  module_code: z
    .enum(["JMS", "EBOOK", "LMS", "REPOSITORY", "WIKI", "RNP"])
    .optional(),
});

export const createPermissionSchema = z.object({
  module_code: z
    .enum(["JMS", "EBOOK", "LMS", "REPOSITORY", "WIKI", "RNP"])
    .nullable()
    .optional(),
  name: z.string().trim().min(2).max(150),
  code: z
    .string()
    .trim()
    .min(2)
    .max(150)
    .regex(/^[A-Z0-9_.]+$/, "Invalid permission code."),
  resource: z.string().trim().min(1).max(100),
  action: z.string().trim().min(1).max(50),
  description: z.string().trim().max(1000).nullable().optional(),
});

export const updatePermissionSchema = z.object({
  name: z.string().trim().min(2).max(150).optional(),
  resource: z.string().trim().min(1).max(100).optional(),
  action: z.string().trim().min(1).max(50).optional(),
  description: z.string().trim().max(1000).nullable().optional(),
}).refine(
  (data) => Object.keys(data).length > 0,
  { message: "At least one field must be provided." }
);
