import { prisma } from "../lib/prisma";

/*
 * Get every permission belonging to a user.
 *
 * Data flow:
 *
 * User
 *   ↓
 * UserRole
 *   ↓
 * Role
 *   ↓
 * RolePermission
 *   ↓
 * Permission
 *
 * We flatten all of that into:
 *
 * Set<string>
 *
 * Example:
 *
 * Set {
 *   "documents:create",
 *   "documents:read",
 *   "documents:update"
 * }
 */

export async function getUserPermissions(
  userId: string
): Promise<Set<string>> {
  const userRoles = await prisma.userRole.findMany({
    where: {
      userId,
    },

    include: {
      role: {
        include: {
          permissions: {
            include: {
              permission: true,
            },
          },
        },
      },
    },
  });

  const permissions = new Set<string>();

  /*
   * A user can have multiple roles.
   *
   * We loop through every role and collect every permission.
   *
   * Set automatically prevents duplicates.
   */
  for (const userRole of userRoles) {
    for (const rolePermission of userRole.role.permissions) {
      permissions.add(rolePermission.permission.name);
    }
  }

  return permissions;
}