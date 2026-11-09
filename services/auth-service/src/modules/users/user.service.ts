
import argon2 from "argon2";

import type { CreateUserInput, ListUsersInput } from "./user.schema.js";
import { userRepository } from "./user.repository.js";
import {
  passwordContainsIdentity,
  revokeUserSessions,
} from "../auth/auth.service.js";
import { sendWelcomeEmail } from "../auth/auth.mail.js";

export class UserServiceError extends Error {
  public readonly statusCode: number;
  public readonly code: string;

  constructor(
    message: string,
    statusCode: number,
    code: string
  ) {
    super(message);

    this.name = "UserServiceError";
    this.statusCode = statusCode;
    this.code = code;
  }
}

export class UserService {
  /**
   * Register a new ORA platform user.
   */
  async createUser(
    data: CreateUserInput,
    createdBy: string
  ) {
    // 1. Check duplicate email and username.
    const existingUser =
      await userRepository.findExistingUser(
        data.email,
        data.username
      );

    if (existingUser) {
      if (
        existingUser.email.toLowerCase() ===
        data.email.toLowerCase()
      ) {
        throw new UserServiceError(
          "This email address is already registered.",
          409,
          "EMAIL_ALREADY_EXISTS"
        );
      }

      if (
        existingUser.username.toLowerCase() ===
        data.username.toLowerCase()
      ) {
        throw new UserServiceError(
          "This username is already taken.",
          409,
          "USERNAME_ALREADY_EXISTS"
        );
      }
    }

    // 2. Validate the selected module.
    const module =
      await userRepository.findActiveModule(
        data.module_code
      );

    if (!module) {
      throw new UserServiceError(
        "The selected module does not exist or is inactive.",
        400,
        "INVALID_MODULE"
      );
    }

    // 3. Validate the selected module role.
    const role =
      await userRepository.findActiveModuleRole(
        data.role_id,
        module.id
      );

    if (!role) {
      throw new UserServiceError(
        "The selected role is invalid or does not belong to this module.",
        400,
        "INVALID_MODULE_ROLE"
      );
    }

    // 4. Validate the LMS library branch.
    if (data.module_code === "LMS") {
      if (!data.branch_id) {
        throw new UserServiceError(
          "A library branch is required for LMS users.",
          400,
          "LIBRARY_BRANCH_REQUIRED"
        );
      }

      const branch =
        await userRepository.findActiveBranch(
          data.branch_id
        );

      if (!branch) {
        throw new UserServiceError(
          "The selected library branch does not exist or is inactive.",
          400,
          "INVALID_LIBRARY_BRANCH"
        );
      }
    }

    if (
      passwordContainsIdentity(data.password, data.email, data.username)
    ) {
      throw new UserServiceError(
        "Password must not contain the user's email address or username.",
        422,
        "WEAK_PASSWORD"
      );
    }

    // 5. Hash the password using Argon2id.
    const passwordHash = await argon2.hash(
      data.password,
      {
        type: argon2.argon2id,
        memoryCost: 19456,
        timeCost: 2,
        parallelism: 1,
      }
    );

    // 6. Create the user and related records.
    const user = await userRepository.createUser(
      data,
      passwordHash,
      createdBy,
      module.id
    );

    await userRepository.writeAudit(
      createdBy,
      "USER_CREATED",
      user.id,
      {
        username: user.username,
        email: user.email,
        module: module.code,
        role: role.code,
      }
    );

    // Not awaited for failure: a mail problem must not undo the user.
    await sendWelcomeEmail(user.email, user.first_name, user.username);

    return {
      message: "User registered successfully.",
      user,
    };
  }

  async listUsers(query: ListUsersInput) {
    return userRepository.listUsers(query);
  }

  async getStats() {
    return userRepository.getStats();
  }

  async getOptions() {
    return userRepository.listModulesAndBranches();
  }

  async setStatus(
    userId: string,
    status: "ACTIVE" | "SUSPENDED",
    actorId: string
  ) {
    if (userId === actorId) {
      throw new UserServiceError(
        "You cannot change the status of your own account.",
        400,
        "CANNOT_CHANGE_OWN_STATUS"
      );
    }

    const user = await userRepository.findUserById(userId);

    if (!user) {
      throw new UserServiceError("User not found.", 404, "USER_NOT_FOUND");
    }

    if (user.status === "PENDING" || user.status === "DISABLED") {
      throw new UserServiceError(
        `A ${user.status.toLowerCase()} account cannot be changed here.`,
        409,
        "INVALID_STATUS_TRANSITION"
      );
    }

    const updated = await userRepository.setStatus(userId, status);

    // A suspended user is signed out everywhere immediately.
    if (status === "SUSPENDED") {
      await revokeUserSessions(userId);
    }

    await userRepository.writeAudit(
      actorId,
      status === "SUSPENDED" ? "USER_SUSPENDED" : "USER_ACTIVATED",
      userId,
      { status }
    );

    return updated;
  }
}

export const userService = new UserService();
