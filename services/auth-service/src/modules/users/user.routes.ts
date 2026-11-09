import { Router } from "express";
import {
  createUserController,
  listUsersController,
  updateUserStatusController,
  userOptionsController,
  userStatsController,
} from "./user.controller.js";
import {
  authenticate,
  requirePasswordChanged,
} from "../../middleware/auth.middleware.js";
import { requireSuperAdmin } from "../../middleware/authorize.middleware.js";

const router = Router();

// Every user-management route: signed in, password already changed,
// and Super Admin.
router.use(authenticate, requirePasswordChanged, requireSuperAdmin);

// GET /api/v1/users            - paginated list (search, status, module)
router.get("/", listUsersController);

// GET /api/v1/users/options    - modules and library branches for forms
router.get("/options", userOptionsController);

// GET /api/v1/users/stats      - counts for the Users page cards
router.get("/stats", userStatsController);

// POST /api/v1/users           - admin-created user
router.post("/", createUserController);

// PATCH /api/v1/users/:id/status - suspend or re-activate
router.patch("/:id/status", updateUserStatusController);

export default router;
