import express from "express";
import {
  getUsers,
  getUserById,
} from "../controllers/user.controller";

import { authenticate } from "../middleware/auth";

const router = express.Router();

// Everything below this point requires a valid access token.
router.use(authenticate);
router.get("/", getUsers);
router.get("/:id", getUserById);

export default router;