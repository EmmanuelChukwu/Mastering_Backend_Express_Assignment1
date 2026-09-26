import { Router } from "express";

import * as authService from "../services/auth.service";
import { validate } from "../middleware/validate";

import {
  registerSchema,
  loginSchema,
  refreshSchema,
  logoutSchema,
} from "../validators/auth.validator";

const router = Router();

/**
 * @swagger
 * /v1/auth/register:
 *   post:
 *     summary: Register a new user
 *     tags:
 *       - Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: student@example.com
 *               password:
 *                 type: string
 *                 minLength: 8
 *                 example: Password123
 *     responses:
 *       201:
 *         description: User created successfully
 *       400:
 *         description: Validation error
 *       409:
 *         description: Email already registered
 */
router.post(
  "/register",
  validate(registerSchema),
  async (req, res, next) => {
    try {
      const user = await authService.register(req.body);

      res.status(201).json({
        success: true,
        data: user,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Login
 *     tags:
 *       - Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 *       400:
 *         description: Validation error
 *       401:
 *         description: Invalid credentials
 */
router.post(
  "/login",
  validate(loginSchema),
  async (req, res, next) => {
    try {
      const result = await authService.login({
        ...req.body,

        // Device information comes from the request,
        // not from user-controlled JSON.
        deviceInfo: req.headers["user-agent"],
      });

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /auth/refresh:
 *   post:
 *     summary: Refresh access and refresh tokens
 *     tags:
 *       - Authentication
 */
router.post(
  "/refresh",
  validate(refreshSchema),
  async (req, res, next) => {
    try {
      const result = await authService.refresh(
        req.body.refreshToken
      );

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     summary: Logout
 *     tags:
 *       - Authentication
 */
router.post(
  "/logout",
  validate(logoutSchema),
  async (req, res, next) => {
    try {
      await authService.logout(req.body.refreshToken);

      res.json({
        success: true,
        data: {
          message: "Logged out",
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;