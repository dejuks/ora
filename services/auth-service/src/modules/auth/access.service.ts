import { prisma } from "../../config/database.js";
import type { AccessClaims } from "./token.service.js";

export interface UserAccess {
    isSuperAdmin: boolean;
    systemRoles: { code: string; name: string }[];
    modules: {
        code: string;
        name: string;
        libraryBranch: string | null;
        roles: { code: string; name: string }[];
    }[];
    permissions: string[];
    claims: Pick<AccessClaims, "roles" | "modules">;
}

/**
 * Load the system roles, module assignments, module roles and the
 * resulting permission codes of a user. Expired or inactive
 * assignments are ignored.
 */
export async function loadUserAccess(
    userId: string
): Promise<UserAccess> {
    const now = new Date();
    const notExpired = [
        { expires_at: null },
        { expires_at: { gt: now } },
    ];

    const [systemRoles, assignments] = await Promise.all([
        prisma.user_system_roles.findMany({
            where: {
                user_id: userId,
                OR: notExpired,
                roles: { is: { is_active: true } },
            },
            include: {
                roles: {
                    include: {
                        role_permissions: {
                            include: { permissions: true },
                        },
                    },
                },
            },
        }),
        prisma.user_module_assignments.findMany({
            where: {
                user_id: userId,
                status: "ACTIVE",
                OR: notExpired,
                modules: { is: { is_active: true } },
            },
            include: {
                modules: true,
                library_branches: true,
                user_module_roles: {
                    where: { OR: notExpired },
                    include: {
                        roles: {
                            include: {
                                role_permissions: {
                                    include: { permissions: true },
                                },
                            },
                        },
                    },
                },
            },
        }),
    ]);

    const permissions = new Set<string>();

    const systemRoleList = systemRoles.map((assignment) => {
        for (const rp of assignment.roles.role_permissions) {
            permissions.add(rp.permissions.code);
        }
        return {
            code: assignment.roles.code,
            name: assignment.roles.name,
        };
    });

    const moduleList = assignments.map((assignment) => {
        const roles = assignment.user_module_roles
            .filter((umr) => umr.roles.is_active)
            .map((umr) => {
                for (const rp of umr.roles.role_permissions) {
                    permissions.add(rp.permissions.code);
                }
                return {
                    code: umr.roles.code,
                    name: umr.roles.name,
                };
            });

        return {
            code: assignment.modules.code,
            name: assignment.modules.name,
            libraryBranch: assignment.library_branches?.name ?? null,
            roles,
        };
    });

    const modulesClaim: Record<string, string[]> = {};
    for (const moduleEntry of moduleList) {
        modulesClaim[moduleEntry.code] = moduleEntry.roles.map(
            (role) => role.code
        );
    }

    return {
        isSuperAdmin: systemRoleList.some(
            (role) => role.code === "SUPER_ADMIN"
        ),
        systemRoles: systemRoleList,
        modules: moduleList,
        permissions: [...permissions].sort(),
        claims: {
            roles: systemRoleList.map((role) => role.code),
            modules: modulesClaim,
        },
    };
}
