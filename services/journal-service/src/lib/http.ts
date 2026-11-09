import type { Request } from "express";
import { z, type ZodType } from "zod";

export class HttpError extends Error {
  constructor(public status: number, message: string, public details?: unknown) {
    super(message);
  }
}
export const notFound = (what = "Resource") => new HttpError(404, `${what} not found.`);
export const forbidden = (m = "You do not have permission to do this.") => new HttpError(403, m);
export const conflict = (m: string) => new HttpError(409, m);

export function parse<T>(schema: ZodType<T>, data: unknown): T {
  const r = schema.safeParse(data);
  if (!r.success) {
    throw new HttpError(
      422,
      "Validation failed.",
      r.error.issues.map((i) => ({ field: i.path.join("."), message: i.message }))
    );
  }
  return r.data;
}

export const uuid = z.string().uuid("Invalid id.");

/** Express 5: req.params values are strings; validate as uuid. */
export function idParam(req: Request, name = "id"): string {
  return parse(uuid, req.params[name]);
}

export const listQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(200).optional(),
  status: z.string().trim().max(40).optional(),
});

export function paged<T>(rows: T[], total: number, page: number, limit: number) {
  return {
    success: true,
    data: rows,
    pagination: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) },
  };
}

export const ok = (data: unknown = null, message?: string) => ({ success: true, message, data });
