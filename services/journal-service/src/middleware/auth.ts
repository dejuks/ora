import type { NextFunction, Request, Response } from "express";
import { jwtVerify } from "jose";
import { HttpError } from "../lib/http.js";

export interface Auth {
  userId: string;
  roles: string[];            // system roles, e.g. SUPER_ADMIN
  jms: string[];              // role codes in the JMS module
  mustChangePassword: boolean;
}

declare global {
  namespace Express {
    interface Request {
      auth?: Auth;
    }
  }
}

function secret(): Uint8Array {
  const s = process.env.ACCESS_TOKEN_SECRET;
  if (!s || s.length < 32) throw new Error("ACCESS_TOKEN_SECRET must contain at least 32 characters.");
  return new TextEncoder().encode(s);
}

/** Verifies the access token issued by the auth service (same secret, issuer, audience). */
export async function authenticate(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) throw new HttpError(401, "Authentication is required.");
  try {
    const { payload } = await jwtVerify(header.slice(7).trim(), secret(), {
      issuer: "ora-auth-service",
      audience: "ora-digital-platform",
      algorithms: ["HS256"],
    });
    if (!payload.sub) throw new Error("no subject");
    const modules = (payload.modules ?? {}) as Record<string, string[]>;
    req.auth = {
      userId: String(payload.sub),
      roles: Array.isArray(payload.roles) ? (payload.roles as string[]) : [],
      jms: Array.isArray(modules.JMS) ? modules.JMS : [],
      mustChangePassword: payload.mcp === true,
    };
  } catch {
    throw new HttpError(401, "Invalid or expired access token.");
  }
  if (req.auth.mustChangePassword) throw new HttpError(403, "You must change your password first.");
  next();
}

export const isSuperAdmin = (a: Auth) => a.roles.includes("SUPER_ADMIN");

export function hasRole(a: Auth, ...codes: string[]): boolean {
  return isSuperAdmin(a) || codes.some((c) => a.jms.includes(c));
}

/** Route guard: user needs at least one of the given JMS roles (super admin always passes). */
export function requireRole(...codes: string[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.auth) throw new HttpError(401, "Authentication is required.");
    if (!hasRole(req.auth, ...codes)) throw new HttpError(403, "You do not have permission to do this.");
    next();
  };
}

// Role groups used across the routes
export const EDITORS = ["EIC", "ASSOCIATE_EDITOR", "JOURNAL_MANAGER", "EDITOR", "MODULE_ADMIN"];
export const MANAGERS = ["JOURNAL_MANAGER", "MODULE_ADMIN"];
export const ADMINS = ["MODULE_ADMIN"];
