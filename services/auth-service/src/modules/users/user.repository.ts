
import { prisma } from "../../config/database.js";
import type { CreateUserInput } from "./user.schema.js";

export class UserRepository {
  /**
   * Check whether email or username is already registered.
   */
  async findExistingUser(email: string, username: string) {
    return prisma.users.findFirst({
      where: {
        OR: [
          { email: email.toLowerCase() },
          { username: username.toLowerCase() },
        ],
        deleted_at: null,
      },
      select: {
        id: true,
        email: true,
        username: true,
      },
    });
  }

  /**
   * Find an active module by its code.
   */
  async findActiveModule(moduleCode: string) {
    return prisma.modules.findFirst({
      where: {
        code: moduleCode,
        is_active: true,
      },
      select: {
        id: true,
        code: true,
        name: true,
      },
    });
  }

  /**
   * Find an active role belonging to the selected module.
   * SYSTEM roles are deliberately excluded.
   */
  async findActiveModuleRole(roleId: string, moduleId: string) {
    return prisma.roles.findFirst({
      where: {
        id: roleId,
        module_id: moduleId,
        scope: "MODULE",
        is_active: true,
      },
      select: {
        id: true,
        name: true,
        code: true,
        module_id: true,
      },
    });
  }

  /**
   * Find an active library branch.
   */
  async findActiveBranch(branchId: string) {
    return prisma.library_branches.findFirst({
      where: {
        id: branchId,
        is_active: true,
      },
      select: {
        id: true,
        name: true,
      },
    });
  }

  /**
   * Create a user and assign the selected module and role.
   *
   * All records are created in one transaction.
   */
 
async createUser(
  data: CreateUserInput,
  passwordHash: string,
  createdBy: string,
  moduleId: string
) {
  return prisma.$transaction(async (tx) => {
    // 1. Create user
    const user = await tx.users.create({
      data: {
        first_name: data.first_name,
        last_name: data.last_name,
        username: data.username,
        email: data.email,
        // Created by an administrator: usable immediately. The user must
        // still replace the temporary password (must_change_password).
        status: "ACTIVE",
        email_verified_at: new Date(),
      },
      select: {
        id: true,
        first_name: true,
        last_name: true,
        username: true,
        email: true,
        status: true,
        created_at: true,
      },
    });

    // 2. Create credentials
    await tx.user_credentials.create({
      data: {
        user_id: user.id,
        password_hash: passwordHash,
        must_change_password: true,
        password_changed_at: new Date(),
      },
    });

    // 3. Create profile
    await tx.user_profiles.create({
      data: {
        user_id: user.id,
      },
    });

    // 4. Assign module
    const assignment =
      await tx.user_module_assignments.create({
        data: {
          user_id: user.id,
          module_id: moduleId,
          library_branch_id: data.branch_id ?? null,
          assigned_by: createdBy,
          status: "ACTIVE",
        },
        select: {
          id: true,
          module_id: true,
          library_branch_id: true,
        },
      });

    // 5. Assign module role
    await tx.user_module_roles.create({
      data: {
        module_assignment_id: assignment.id,
        module_id: moduleId,
        role_id: data.role_id,
        assigned_by: createdBy,
      },
    });

    return {
      ...user,
      module_assignment: assignment,
    };
  });
}


  /**
   * Paginated user list with module roles.
   */
  async listUsers(query: {
    page: number;
    limit: number;
    search?: string;
    status?: string;
    module_code?: string;
    role_code?: string;
  }) {
    const where: any = { deleted_at: null };

    if (query.status) where.status = query.status;

    if (query.search) {
      where.OR = [
        { first_name: { contains: query.search, mode: "insensitive" } },
        { last_name: { contains: query.search, mode: "insensitive" } },
        { email: { contains: query.search, mode: "insensitive" } },
        { username: { contains: query.search, mode: "insensitive" } },
      ];
    }

    if (query.module_code || query.role_code) {
      const assignment: any = {};
      if (query.module_code) {
        assignment.modules = { is: { code: query.module_code } };
      }
      if (query.role_code) {
        assignment.user_module_roles = {
          some: { roles: { is: { code: query.role_code } } },
        };
      }
      where.user_module_assignments_user_module_assignments_user_idTousers =
        { some: assignment };
    }

    const [total, rows] = await prisma.$transaction([
      prisma.users.count({ where }),
      prisma.users.findMany({
        where,
        orderBy: { created_at: "desc" },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        select: {
          id: true,
          first_name: true,
          last_name: true,
          username: true,
          email: true,
          status: true,
          email_verified_at: true,
          last_login_at: true,
          created_at: true,
          user_system_roles_user_system_roles_user_idTousers: {
            select: { roles: { select: { code: true, name: true } } },
          },
          user_module_assignments_user_module_assignments_user_idTousers:
            {
              select: {
                modules: { select: { code: true, name: true } },
                user_module_roles: {
                  select: {
                    roles: { select: { code: true, name: true } },
                  },
                },
              },
            },
        },
      }),
    ]);

    const items = rows.map((user) => ({
      id: user.id,
      firstName: user.first_name,
      lastName: user.last_name,
      username: user.username,
      email: user.email,
      status: user.status,
      emailVerifiedAt: user.email_verified_at,
      lastLoginAt: user.last_login_at,
      createdAt: user.created_at,
      systemRoles:
        user.user_system_roles_user_system_roles_user_idTousers.map(
          (item) => item.roles
        ),
      modules:
        user.user_module_assignments_user_module_assignments_user_idTousers.map(
          (assignment) => ({
            code: assignment.modules.code,
            name: assignment.modules.name,
            roles: assignment.user_module_roles.map((r) => r.roles),
          })
        ),
    }));

    return {
      items,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.max(Math.ceil(total / query.limit), 1),
      },
    };
  }

  /**
   * Counts for the Users page cards. A user with the same role in several
   * modules is counted once.
   */
  async getStats() {
    const roleCount = (code: string) =>
      prisma.users.count({
        where: {
          deleted_at: null,
          user_module_assignments_user_module_assignments_user_idTousers: {
            some: {
              user_module_roles: {
                some: { roles: { is: { code } } },
              },
            },
          },
        },
      });

    const [total, pending, active, suspended, editors, reviewers, authors] =
      await Promise.all([
        prisma.users.count({ where: { deleted_at: null } }),
        prisma.users.count({
          where: { deleted_at: null, status: "PENDING" },
        }),
        prisma.users.count({
          where: { deleted_at: null, status: "ACTIVE" },
        }),
        prisma.users.count({
          where: { deleted_at: null, status: "SUSPENDED" },
        }),
        roleCount("EDITOR"),
        roleCount("REVIEWER"),
        roleCount("AUTHOR"),
      ]);

    return { total, pending, active, suspended, editors, reviewers, authors };
  }

  async findUserById(id: string) {
    return prisma.users.findFirst({
      where: { id, deleted_at: null },
      select: { id: true, status: true, email: true },
    });
  }

  async setStatus(id: string, status: "ACTIVE" | "SUSPENDED") {
    return prisma.users.update({
      where: { id },
      data: { status, updated_at: new Date() },
      select: { id: true, status: true },
    });
  }

  async listModulesAndBranches() {
    const [modules, branches] = await Promise.all([
      prisma.modules.findMany({
        where: { is_active: true },
        orderBy: { name: "asc" },
        select: { code: true, name: true },
      }),
      prisma.library_branches.findMany({
        where: { is_active: true },
        orderBy: { name: "asc" },
        select: { id: true, name: true },
      }),
    ]);

    return { modules, branches };
  }

  async writeAudit(
    actorId: string,
    action: string,
    entityId: string,
    newValues: Record<string, unknown>
  ) {
    await prisma.audit_logs.create({
      data: {
        actor_user_id: actorId,
        action,
        entity_type: "user",
        entity_id: entityId,
        new_values: newValues as any,
      },
    });
  }
}

export const userRepository = new UserRepository();
