import type { Request, Response } from "express";
import {
  createUserSchema,
  listUsersSchema,
  updateUserStatusSchema,
  userIdSchema,
} from "./user.schema.js";
import {
  userService,
  UserServiceError,
} from "./user.service.js";

export async function createUserController(
  req: Request,
  res: Response
): Promise<void> {
  try {
    // Validate request body
    const validation = createUserSchema.safeParse(req.body);

    if (!validation.success) {
      res.status(400).json({
        success: false,
        message: "Please check the submitted user information.",
        errors: validation.error.flatten().fieldErrors,
      });
      return;
    }

    // The authenticated Super Admin ID comes from auth middleware
    const createdBy = req.auth?.id;

    if (!createdBy) {
      res.status(401).json({
        success: false,
        message: "Authentication is required.",
      });
      return;
    }

    // Create user through the service layer
    const result = await userService.createUser(
      validation.data,
      createdBy
    );

    res.status(201).json({
      success: true,
      message: result.message,
      data: {
        user: result.user,
      },
    });
  } catch (error) {
    if (error instanceof UserServiceError) {
      res.status(error.statusCode).json({
        success: false,
        message: error.message,
        code: error.code,
      });
      return;
    }

    console.error("Create user controller error:", error);

    res.status(500).json({
      success: false,
      message: "An unexpected error occurred while registering the user.",
    });
  }
}

function sendError(res: Response, error: unknown, context: string): void {
  if (error instanceof UserServiceError) {
    res.status(error.statusCode).json({
      success: false,
      message: error.message,
      code: error.code,
    });
    return;
  }

  console.error(`${context}:`, error);
  res.status(500).json({
    success: false,
    message: "An unexpected error occurred.",
  });
}

export async function listUsersController(
  req: Request,
  res: Response
): Promise<void> {
  const validation = listUsersSchema.safeParse(req.query);

  if (!validation.success) {
    res.status(422).json({
      success: false,
      message: "Invalid query parameters.",
      errors: validation.error.flatten().fieldErrors,
    });
    return;
  }

  try {
    const data = await userService.listUsers(validation.data);
    res.status(200).json({ success: true, data });
  } catch (error) {
    sendError(res, error, "List users controller error");
  }
}

export async function userOptionsController(
  _req: Request,
  res: Response
): Promise<void> {
  try {
    const data = await userService.getOptions();
    res.status(200).json({ success: true, data });
  } catch (error) {
    sendError(res, error, "User options controller error");
  }
}

export async function updateUserStatusController(
  req: Request,
  res: Response
): Promise<void> {
  const params = userIdSchema.safeParse(req.params);
  const body = updateUserStatusSchema.safeParse(req.body);

  if (!params.success || !body.success) {
    res.status(422).json({
      success: false,
      message: "Invalid request.",
      errors: {
        ...(params.success ? {} : params.error.flatten().fieldErrors),
        ...(body.success ? {} : body.error.flatten().fieldErrors),
      },
    });
    return;
  }

  try {
    const data = await userService.setStatus(
      params.data.id,
      body.data.status,
      req.auth!.id
    );
    res.status(200).json({
      success: true,
      message: "User status updated.",
      data,
    });
  } catch (error) {
    sendError(res, error, "Update user status controller error");
  }
}

export async function userStatsController(
  _req: Request,
  res: Response
): Promise<void> {
  try {
    const data = await userService.getStats();
    res.status(200).json({ success: true, data });
  } catch (error) {
    sendError(res, error, "User stats controller error");
  }
}
