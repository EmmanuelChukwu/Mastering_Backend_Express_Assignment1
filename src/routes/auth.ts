import { Router } from "express";
import * as authService from "../services/auth.service";

const router = Router();

// POST /api/auth/register
//
// The route's job is simply to:
// 1. Receive the request
// 2. Pass the data to the auth service
// 3. Return the result
//
// The actual registration logic stays in auth.service.ts.
router.post("/register", async (req, res, next) => {
  try {
    const user = await authService.register(req.body);

    res.status(201).json({
      user,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/auth/login
//
// We also pass the browser/client's User-Agent to the service.
// This can later be used for login/session tracking.
router.post("/login", async (req, res, next) => {
  try {
    const result = await authService.login({
      ...req.body,
      deviceInfo: req.headers["user-agent"],
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
});

// POST /api/auth/refresh
//
// The client sends:
// {
//   "refreshToken": "..."
// }
//
// The service verifies and rotates that token.
router.post("/refresh", async (req, res, next) => {
  try {
    const result = await authService.refresh(req.body.refreshToken);

    res.json(result);
  } catch (error) {
    next(error);
  }
});

// POST /api/auth/logout
//
// The client sends its refresh token.
// The service removes that token from the database.
router.post("/logout", async (req, res, next) => {
  try {
    await authService.logout(req.body.refreshToken);

    res.json({
      message: "Logged out",
    });
  } catch (error) {
    next(error);
  }
});

export default router;