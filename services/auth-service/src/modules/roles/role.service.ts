
import { prisma } from "../../config/database.js";

type RoleScope = "SYSTEM" | "MODULE";

type CreateRoleInput = {
  name: string;
  code: string;
  scope: RoleScope;
  module_code?: string | null;
  description?: string | null;
  permission_ids?: string[];
};

type UpdateRoleInput = {
  name?: string;
  description?: string | null;
  is_active?: boolean;
};

type CreatePermissionInput = {
  module_code?: string | null;
  name: string;
  code: string;
  resource: string;
  action: string;
  description?: string | null;
};

type UpdatePermissionInput = {
  name?: string;
  resource?: string;
  action?: string;
  description?: string | null;
};

export class RoleError extends Error {
  statusCode: number;
  code: string;

  constructor(message: string, statusCode = 400, code = "ROLE_ERROR") {
    super(message);
    this.name = "RoleError";
    this.statusCode = statusCode;
    this.code = code;
  }
}

export class RoleService {
  private static async getModuleId(moduleCode?: string | null) {
    if (!moduleCode) return null;

    const module = await prisma.modules.findUnique({
      where: { code: moduleCode },
      select: { id: true, code: true },
    });

    if (!module) {
      throw new RoleError("Module not found.", 404, "MODULE_NOT_FOUND");
    }

    return module.id;
  }

  private static async validatePermissions(
    permissionIds: string[],
    scope: RoleScope,
    moduleId: string | null
  ) {
    const uniqueIds = [...new Set(permissionIds)];

    if (uniqueIds.length !== permissionIds.length) {
      throw new RoleError(
        "Duplicate permission IDs are not allowed.",
        422,
        "DUPLICATE_PERMISSION"
      );
    }

    if (uniqueIds.length === 0) return;

    const permissions = await prisma.permissions.findMany({
      where: { id: { in: uniqueIds } },
      select: { id: true, module_id: true },
    });

    if (permissions.length !== uniqueIds.length) {
      throw new RoleError(
        "One or more permissions were not found.",
        404,
        "PERMISSION_NOT_FOUND"
      );
    }

    const invalidPermission = permissions.some((permission) => {
      if (scope === "SYSTEM") {
        return permission.module_id !== null;
      }

      return (
        permission.module_id !== null &&
        permission.module_id !== moduleId
      );
    });

    if (invalidPermission) {
      throw new RoleError(
        "The selected permissions do not belong to this role's scope or module.",
        422,
        "INVALID_PERMISSION_SCOPE"
      );
    }
  }

  static async getRoles(query: any) {
    const page = Math.max(Number(query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(query.limit) || 20, 1), 100);
    const skip = (page - 1) * limit;

    const where: any = {};

    if (query.search) {
      where.OR = [
        { name: { contains: String(query.search), mode: "insensitive" } },
        { code: { contains: String(query.search), mode: "insensitive" } },
      ];
    }

    if (query.scope) {
      where.scope = query.scope;
    }

    if (query.module_code) {
      where.modules = { code: query.module_code };
    }

    const [total, roles] = await prisma.$transaction([
      prisma.roles.count({ where }),
      prisma.roles.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: "desc" },
        include: {
          modules: {
            select: { id: true, code: true, name: true },
          },
          _count: {
            select: {
              role_permissions: true,
              user_module_roles: true,
              user_system_roles: true,
            },
          },
        },
      }),
    ]);

    return {
      items: roles,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  static async getRole(id: string) {
    const role = await prisma.roles.findUnique({
      where: { id },
      include: {
        modules: {
          select: { id: true, code: true, name: true },
        },
        role_permissions: {
          include: {
            permissions: true,
          },
          orderBy: { created_at: "asc" },
        },
        _count: {
          select: {
            role_permissions: true,
            user_module_roles: true,
            user_system_roles: true,
          },
        },
      },
    });

    if (!role) {
      throw new RoleError("Role not found.", 404, "ROLE_NOT_FOUND");
    }

    return role;
  }

  static async createRole(input: CreateRoleInput, assignedBy: string) {
    const moduleId = await this.getModuleId(input.module_code);

    if (input.scope === "SYSTEM" && moduleId !== null) {
      throw new RoleError(
        "System roles cannot belong to a module.",
        422,
        "INVALID_ROLE_SCOPE"
      );
    }

    if (input.scope === "MODULE" && moduleId === null) {
      throw new RoleError(
        "Module roles must belong to a module.",
        422,
        "MODULE_REQUIRED"
      );
    }

    if (input.code === "SUPER_ADMIN") {
      throw new RoleError(
        "SUPER_ADMIN is a protected system role.",
        403,
        "PROTECTED_ROLE"
      );
    }

    const permissionIds = input.permission_ids ?? [];
    await this.validatePermissions(permissionIds, input.scope, moduleId);

    return prisma.$transaction(async (tx) => {
      const role = await tx.roles.create({
        data: {
          name: input.name,
          code: input.code,
          scope: input.scope,
          module_id: moduleId,
          description: input.description ?? null,
          is_system_role: false,
          is_active: true,
        },
      });

      if (permissionIds.length > 0) {
        await tx.role_permissions.createMany({
          data: permissionIds.map((permissionId) => ({
            role_id: role.id,
            permission_id: permissionId,
          })),
        });
      }

      return tx.roles.findUnique({
        where: { id: role.id },
        include: {
          modules: true,
          role_permissions: {
            include: { permissions: true },
          },
        },
      });
    });
  }

  static async updateRole(id: string, input: UpdateRoleInput) {
    const existing = await prisma.roles.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new RoleError("Role not found.", 404, "ROLE_NOT_FOUND");
    }

    if (existing.is_system_role || existing.code === "SUPER_ADMIN") {
      throw new RoleError(
        "System roles cannot be modified.",
        403,
        "PROTECTED_ROLE"
      );
    }

    return prisma.roles.update({
      where: { id },
      data: {
        ...(input.name !== undefined && { name: input.name }),
        ...(input.description !== undefined && {
          description: input.description,
        }),
        ...(input.is_active !== undefined && {
          is_active: input.is_active,
        }),
      },
      include: {
        modules: true,
        role_permissions: {
          include: { permissions: true },
        },
      },
    });
  }

  static async deleteRole(id: string) {
    const existing = await prisma.roles.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            user_module_roles: true,
            user_system_roles: true,
          },
        },
      },
    });

    if (!existing) {
      throw new RoleError("Role not found.", 404, "ROLE_NOT_FOUND");
    }

    if (existing.is_system_role || existing.code === "SUPER_ADMIN") {
      throw new RoleError(
        "System roles cannot be deleted.",
        403,
        "PROTECTED_ROLE"
      );
    }

    const assignedUsers =
      existing._count.user_module_roles +
      existing._count.user_system_roles;

    if (assignedUsers > 0) {
      await prisma.roles.update({
        where: { id },
        data: { is_active: false },
      });

      return {
        message: "Role is assigned to users, so it was deactivated instead of deleted.",
        deactivated: true,
      };
    }

    await prisma.$transaction([
      prisma.role_permissions.deleteMany({
        where: { role_id: id },
      }),
      prisma.roles.delete({
        where: { id },
      }),
    ]);

    return {
      message: "Role deleted successfully.",
      deactivated: false,
    };
  }

  static async replaceRolePermissions(
    roleId: string,
    permissionIds: string[]
  ) {
    const role = await prisma.roles.findUnique({
      where: { id: roleId },
    });

    if (!role) {
      throw new RoleError("Role not found.", 404, "ROLE_NOT_FOUND");
    }

    if (role.is_system_role || role.code === "SUPER_ADMIN") {
      throw new RoleError(
        "Permissions of protected system roles cannot be changed.",
        403,
        "PROTECTED_ROLE"
      );
    }

    await this.validatePermissions(
      permissionIds,
      role.scope as RoleScope,
      role.module_id
    );

    return prisma.$transaction(async (tx) => {
      await tx.role_permissions.deleteMany({
        where: { role_id: roleId },
      });

      if (permissionIds.length > 0) {
        await tx.role_permissions.createMany({
          data: [...new Set(permissionIds)].map((permissionId) => ({
            role_id: roleId,
            permission_id: permissionId,
          })),
        });
      }

      return tx.roles.findUnique({
        where: { id: roleId },
        include: {
          modules: true,
          role_permissions: {
            include: { permissions: true },
          },
        },
      });
    });
  }

  static async getPermissions(query: any) {
    const page = Math.max(Number(query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(query.limit) || 20, 1), 100);
    const skip = (page - 1) * limit;

    const where: any = {};

    if (query.search) {
      where.OR = [
        { name: { contains: String(query.search), mode: "insensitive" } },
        { code: { contains: String(query.search), mode: "insensitive" } },
        { resource: { contains: String(query.search), mode: "insensitive" } },
      ];
    }

    if (query.module_code) {
      where.modules = { code: query.module_code };
    }

    const [total, permissions] = await prisma.$transaction([
      prisma.permissions.count({ where }),
      prisma.permissions.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: "desc" },
        include: {
          modules: {
            select: { id: true, code: true, name: true },
          },
          _count: {
            select: { role_permissions: true },
          },
        },
      }),
    ]);

    return {
      items: permissions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  static async createPermission(input: CreatePermissionInput) {
    const moduleId = await this.getModuleId(input.module_code);

    return prisma.permissions.create({
      data: {
        module_id: moduleId,
        name: input.name,
        code: input.code,
        resource: input.resource,
        action: input.action,
        description: input.description ?? null,
      },
      include: { modules: true },
    });
  }

  static async updatePermission(
    id: string,
    input: UpdatePermissionInput
  ) {
    const existing = await prisma.permissions.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new RoleError(
        "Permission not found.",
        404,
        "PERMISSION_NOT_FOUND"
      );
    }

    return prisma.permissions.update({
      where: { id },
      data: {
        ...(input.name !== undefined && { name: input.name }),
        ...(input.resource !== undefined && { resource: input.resource }),
        ...(input.action !== undefined && { action: input.action }),
        ...(input.description !== undefined && {
          description: input.description,
        }),
      },
      include: { modules: true },
    });
  }

  static async deletePermission(id: string) {
    const existing = await prisma.permissions.findUnique({
      where: { id },
      include: {
        _count: {
          select: { role_permissions: true },
        },
      },
    });

    if (!existing) {
      throw new RoleError(
        "Permission not found.",
        404,
        "PERMISSION_NOT_FOUND"
      );
    }

    if (existing._count.role_permissions > 0) {
      throw new RoleError(
        "This permission is assigned to roles. Remove those assignments before deleting it.",
        409,
        "PERMISSION_IN_USE"
      );
    }

    await prisma.permissions.delete({
      where: { id },
    });

    return {
      message: "Permission deleted successfully.",
    };
  }
}
