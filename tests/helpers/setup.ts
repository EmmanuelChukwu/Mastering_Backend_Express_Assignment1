import { prisma } from "../../src/lib/prisma";

// ============================================================
// RESET TEST DATABASE
// ============================================================
//
// Each integration test needs predictable starting data.
//
// We delete child records before parent records because
// foreign-key relationships may otherwise prevent deletion.
//
// The PDF lists refreshToken first and user second.
// ============================================================

export async function resetDatabase() {
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany();
}

// ============================================================
// CREATE TEST USER
// ============================================================
//
// We need a reusable way of creating users for tests.
//
// bcrypt uses only 4 rounds here because this function may
// execute many times during a test run.
//
// Production should continue using your normal secure rounds.
// ============================================================

export async function createTestUser(overrides: Record<string, unknown> = {}) {
  const bcrypt = await import("bcryptjs");

  const hash = await bcrypt.hash("TestPassword1!", 4);

  // Ensure required RBAC entries exist and are linked.
  const permission = await prisma.permission.upsert({
    where: { name: "users:read" },
    update: {},
    create: {
      name: "users:read",
      resource: "users",
      action: "read",
    },
  });

  const role = await prisma.role.upsert({
    where: { name: "member" },
    update: {},
    create: { name: "member", isDefault: true },
  });

  await prisma.rolePermission.upsert({
    where: {
      roleId_permissionId: {
        roleId: role.id,
        permissionId: permission.id,
      },
    },
    update: {},
    create: {
      roleId: role.id,
      permissionId: permission.id,
    },
  });

  const user = await prisma.user.create({
    data: {
      name: "Test User",
      email: "test@docuchat.dev",
      passwordHash: hash,

      role: "user",
      tier: "free",
      isActive: true,

      ...overrides,
    },
  });

  // Assign the role to the user so protected routes work.
  await prisma.userRole.create({
    data: {
      userId: user.id,
      roleId: role.id,
    },
  });

  return user;
}
