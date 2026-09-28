import express from "express";

import {
  getUsers,
  getUserById,
} from "../controllers/user.controller";

import { authenticate } from "../middleware/auth";
import { requirePermission } from "../middleware/authorize";

const router = express.Router();

// First establish identity.
router.use(authenticate);

// Then establish permission.
router.get(
  "/",
  requirePermission("users:read"),
  getUsers
);

router.get(
  "/:id",
  requirePermission("users:read"),
  getUserById
);

export default router;