import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

// PostgreSQL connection used by the seed script.
// This is separate from prisma7.config.ts because the seed
// script creates its own PrismaClient instance.
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not defined");
}

const adapter = new PrismaPg({
  connectionString,
});

const prisma = new PrismaClient({
  adapter,
});

/*
 * RBAC seed data.
 *
 * Why seed this?
 *
 * Roles and permissions are configuration/data that our application
 * expects to exist before users start registering.
 *
 * We use upsert() so running the seed multiple times is safe.
 */

async function seedRBAC() {
  // ============================================================
  // 1. DEFINE PERMISSIONS
  // ============================================================

  const permissionDefs = [
    {
      name: "documents:create",
      resource: "documents",
      action: "create",
      description: "Upload documents",
    },
    {
      name: "documents:read",
      resource: "documents",
      action: "read",
      description: "View documents",
    },
    {
      name: "documents:update",
      resource: "documents",
      action: "update",
      description: "Edit document metadata",
    },
    {
      name: "documents:delete",
      resource: "documents",
      action: "delete",
      description: "Delete documents",
    },
    {
      name: "conversations:create",
      resource: "conversations",
      action: "create",
      description: "Start conversations",
    },
    {
      name: "conversations:read",
      resource: "conversations",
      action: "read",
      description: "View conversations",
    },
    {
      name: "users:read",
      resource: "users",
      action: "read",
      description: "View user list",
    },
    {
      name: "users:manage",
      resource: "users",
      action: "manage",
      description: "Manage user accounts",
    },
    {
      name: "roles:manage",
      resource: "roles",
      action: "manage",
      description: "Manage roles and permissions",
    },
  ];

  /*
   * Store permissions in an object:
   *
   * permissions["documents:read"]
   *
   * gives us the complete database record, including its ID.
   *
   * We need that ID later when creating RolePermission records.
   */
  const permissions: Record<string, any> = {};

  for (const permission of permissionDefs) {
    permissions[permission.name] = await prisma.permission.upsert({
      where: {
        name: permission.name,
      },
      update: {},
      create: permission,
    });
  }

  // ============================================================
  // 2. DEFINE ROLES
  // ============================================================

  const roleDefs = [
    {
      name: "admin",
      description: "Full system access",

      // Admin gets every permission.
      permissions: Object.keys(permissions),
    },

    {
      name: "member",
      description: "Standard user",

      // New registrations receive this role.
      isDefault: true,

      permissions: [
        "documents:create",
        "documents:read",
        "documents:update",
        "conversations:create",
        "conversations:read",
      ],
    },

    {
      name: "viewer",
      description: "Read-only access",

      permissions: ["documents:read", "conversations:read"],
    },
  ];

  // ============================================================
  // 3. CREATE ROLES
  // ============================================================

  for (const roleDef of roleDefs) {
    const role = await prisma.role.upsert({
      where: {
        name: roleDef.name,
      },

      update: {},

      create: {
        name: roleDef.name,
        description: roleDef.description,
        isDefault: roleDef.isDefault ?? false,
      },
    });

    // ==========================================================
    // 4. CONNECT ROLE → PERMISSIONS
    // ==========================================================

    for (const permissionName of roleDef.permissions) {
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: role.id,
            permissionId: permissions[permissionName].id,
          },
        },

        update: {},

        create: {
          roleId: role.id,
          permissionId: permissions[permissionName].id,
        },
      });
    }
  }

  console.log("RBAC seeded: 3 roles, 9 permissions");
}

/*
 * Main seed entry point.
 *
 * Later, when we add more seed data, we'll call those seed
 * functions from here as well.
 */
async function main() {
  await seedRBAC();
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
