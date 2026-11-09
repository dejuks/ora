
import type {
  Request,
  Response,
  NextFunction,
} from "express";

import { prisma } from "../config/database.js";

/**
 * Require an active system-level Super Admin role.
 *
 * IMPORTANT:
 * authenticate middleware must run before this middleware.
 */
export async function requireSuperAdmin(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // 1. Ensure the request is authenticated.
    if (!req.auth?.id) {
      res.status(401).json({
        success: false,
        message: "Authentication is required.",
      });
      return;
    }

    const userId = req.auth.id;
    const now = new Date();

    // 2. Check the user's system-level role assignment.
    const assignment =
      await prisma.user_system_roles.findFirst({
        where: {
          user_id: userId,
          OR: [
            { expires_at: null },
            { expires_at: { gt: now } },
          ],
          roles: {
            is: {
              code: "SUPER_ADMIN",
              scope: "SYSTEM",
              is_system_role: true,
              is_active: true,
            },
          },
        },
        select: {
          id: true,
        },
      });

    // 3. Reject users without Super Admin permission.
    if (!assignment) {
      res.status(403).json({
        success: false,
        message:
          "You do not have permission to perform this action.",
      });
      return;
    }

    // 4. Continue to the protected controller.
    next();
  } catch (error) {
    console.error(
      "Super Admin authorization error:",
      error
    );

    res.status(500).json({
      success: false,
      message: "Authorization could not be completed.",
    });
  }
}
