
import type { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";

import {
  RoleError,
  RoleService,
} from "./role.service.js";

// Safely retrieve the role ID from Express route parameters.
function getRoleId(req: Request): string {
  const id = req.params.id;

  if (Array.isArray(id)) {
    return id[0] ?? "";
  }

  return id;
}

// GET /api/v1/roles
export async function getRolesController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const result = await RoleService.getRoles(req.query);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

// GET /api/v1/roles/:id
export async function getRoleController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const result = await RoleService.getRole(getRoleId(req));

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

// POST /api/v1/roles
export async function createRoleController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    if (!req.auth?.id) {
      res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
      return;
    }

    const result = await RoleService.createRole(
      req.body,
      req.auth.id
    );

    res.status(201).json({
      success: true,
      message: "Role created successfully.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

// PATCH /api/v1/roles/:id
export async function updateRoleController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const result = await RoleService.updateRole(
      getRoleId(req),
      req.body
    );

    res.status(200).json({
      success: true,
      message: "Role updated successfully.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

// DELETE /api/v1/roles/:id
export async function deleteRoleController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const result = await RoleService.deleteRole(getRoleId(req));

    res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    next(error);
  }
}

// PUT /api/v1/roles/:id/permissions
export async function replaceRolePermissionsController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const result = await RoleService.replaceRolePermissions(
      getRoleId(req),
      req.body.permission_ids
    );

    res.status(200).json({
      success: true,
      message: "Role permissions updated successfully.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

// Role error handler
export function handleRoleError(
  error: unknown,
  _req: Request,
  res: Response,
  next: NextFunction
) {
  if (error instanceof ZodError) {
    res.status(422).json({
      success: false,
      message: "Validation failed.",
      errors: error.issues,
    });
    return;
  }

  if (error instanceof RoleError) {
    res.status(error.statusCode).json({
      success: false,
      code: error.code,
      message: error.message,
    });
    return;
  }

  next(error);
}
