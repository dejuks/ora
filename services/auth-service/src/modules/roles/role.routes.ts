
import { Router, type Request, type Response, type NextFunction } from "express";

import {
  authenticate,
  requirePasswordChanged,
} from "../../middleware/auth.middleware.js";
import { requireSuperAdmin } from "../../middleware/authorize.middleware.js";

import {
  roleListSchema,
  roleIdSchema,
  createRoleSchema,
  updateRoleSchema,
  replaceRolePermissionsSchema,
  permissionListSchema,
  createPermissionSchema,
  updatePermissionSchema,
} from "./role.schema.js";

import {
  getRolesController,
  getRoleController,
  createRoleController,
  updateRoleController,
  deleteRoleController,
  replaceRolePermissionsController,
  handleRoleError,
} from "./role.controller.js";

import { RoleService } from "./role.service.js";

const router = Router();

/**
 * Request validation middleware
 */
function validateQuery(schema: any) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.query);

    if (!result.success) {
      res.status(422).json({
        success: false,
        message: "Invalid query parameters.",
        errors: result.error.issues,
      });
      return;
    }

    // Express 5 exposes req.query as a read-only getter, so it cannot be
    // assigned directly. Redefine the property with the parsed values.
    Object.defineProperty(req, "query", {
      value: result.data,
      writable: true,
      configurable: true,
      enumerable: true,
    });
    next();
  };
}

function validateBody(schema: any) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      res.status(422).json({
        success: false,
        message: "Request validation failed.",
        errors: result.error.issues,
      });
      return;
    }

    req.body = result.data;
    next();
  };
}

function validateParams(schema: any) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.params);

    if (!result.success) {
      res.status(422).json({
        success: false,
        message: "Invalid route parameters.",
        errors: result.error.issues,
      });
      return;
    }

    next();
  };
}

/**
 * All role and permission management routes
 * require authentication and Super Admin authorization.
 */
router.use(authenticate);
router.use(requirePasswordChanged);
router.use(requireSuperAdmin);

/* =====================================================
   PERMISSIONS
===================================================== */

// GET /api/v1/roles/permissions
router.get(
  "/permissions",
  validateQuery(permissionListSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await RoleService.getPermissions(req.query);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/v1/roles/permissions
router.post(
  "/permissions",
  validateBody(createPermissionSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await RoleService.createPermission(req.body);

      res.status(201).json({
        success: true,
        message: "Permission created successfully.",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
);

/* =====================================================
   ROLES
===================================================== */

// GET /api/v1/roles
router.get(
  "/",
  validateQuery(roleListSchema),
  getRolesController
);

// GET /api/v1/roles/:id
router.get(
  "/:id",
  validateParams(roleIdSchema),
  getRoleController
);

// POST /api/v1/roles
router.post(
  "/",
  validateBody(createRoleSchema),
  createRoleController
);

// PATCH /api/v1/roles/:id
router.patch(
  "/:id",
  validateParams(roleIdSchema),
  validateBody(updateRoleSchema),
  updateRoleController
);

// DELETE /api/v1/roles/:id
router.delete(
  "/:id",
  validateParams(roleIdSchema),
  deleteRoleController
);

// PUT /api/v1/roles/:id/permissions
router.put(
  "/:id/permissions",
  validateParams(roleIdSchema),
  validateBody(replaceRolePermissionsSchema),
  replaceRolePermissionsController
);

// PATCH /api/v1/roles/permissions/:id
router.patch(
  "/permissions/:id",
  validateParams(roleIdSchema),
  validateBody(updatePermissionSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await RoleService.updatePermission(
        req.params.id as string,
        req.body
      );

      res.status(200).json({
        success: true,
        message: "Permission updated successfully.",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
);

// DELETE /api/v1/roles/permissions/:id
router.delete(
  "/permissions/:id",
  validateParams(roleIdSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await RoleService.deletePermission(
        req.params.id as string
      );

      res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Role-specific error handler
 */
router.use(handleRoleError);

export default router;
