import { Router } from "express";

import { authenticate } from "../middleware/auth";
import { requirePermission } from "../middleware/authorize";

import { prisma } from "../lib/prisma";
import { appEvents } from "../lib/events";
import { NotFoundError } from "../lib/errors";

const router = Router();

// Every admin route requires authentication.
router.use(authenticate);

// Every admin route also requires permission to manage roles.
router.use(requirePermission("roles:manage"));

// ============================================================
// GET /api/v1/admin/roles
// ============================================================
//
// Return every role, its permissions, and how many users have it.
// ============================================================

router.get("/roles", async (req, res, next) => {
  try {
    const roles = await prisma.role.findMany({
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },

        _count: {
          select: {
            users: true,
          },
        },
      },
    });

    res.json({
      success: true,

      data: roles.map((role) => ({
        id: role.id,
        name: role.name,
        description: role.description,
        isDefault: role.isDefault,

        userCount: role._count.users,

        permissions: role.permissions.map(
          (rolePermission) =>
            rolePermission.permission.name
        ),
      })),
    });
  } catch (error) {
    next(error);
  }
});

// ============================================================
// POST /api/v1/admin/users/:userId/roles
// ============================================================
//
// Assign a role to a user.
// ============================================================

router.post(
  "/users/:userId/roles",
  async (req, res, next) => {
    try {
      const { userId } = req.params;
      const { roleName } = req.body;

      const user = await prisma.user.findUnique({
        where: {
          id: userId,
        },
      });

      if (!user) {
        throw new NotFoundError("User not found");
      }

      const role = await prisma.role.findUnique({
        where: {
          name: roleName,
        },
      });

      if (!role) {
        throw new NotFoundError(
          `Role '${roleName}' not found`
        );
      }

      /*
       * upsert means:
       *
       * - create the assignment if it doesn't exist
       * - do nothing if it already exists
       *
       * This works because UserRole has a composite key:
       * userId + roleId
       */
      await prisma.userRole.upsert({
        where: {
          userId_roleId: {
            userId,
            roleId: role.id,
          },
        },

        update: {},

        create: {
          userId,
          roleId: role.id,

          // Useful for auditing who made the change.
          assignedBy: req.user!.id,
        },
      });

      // Tell the event system about the administrative action.
      appEvents.emit("admin:role-assigned", {
        targetUserId: userId,
        roleName,
        assignedBy: req.user!.id,
      });

      res.json({
        success: true,

        data: {
          message: `Role '${roleName}' assigned to user`,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// ============================================================
// DELETE /api/v1/admin/users/:userId/roles/:roleName
// ============================================================

router.delete(
  "/users/:userId/roles/:roleName",
  async (req, res, next) => {
    try {
      const { userId, roleName } = req.params;

      const role = await prisma.role.findUnique({
        where: {
          name: roleName,
        },
      });

      if (!role) {
        throw new NotFoundError("Role not found");
      }

      await prisma.userRole.deleteMany({
        where: {
          userId,
          roleId: role.id,
        },
      });

      appEvents.emit("admin:role-revoked", {
        targetUserId: userId,
        roleName,
        revokedBy: req.user!.id,
      });

      res.json({
        success: true,

        data: {
          message: `Role '${roleName}' revoked`,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;