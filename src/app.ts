import express, { Request, Response } from "express";

import swaggerUi from "swagger-ui-express";
import { swaggerSpec } from "./config/swagger";
import correlationId from "./middleware/correlationId";
import logger from "./middleware/logger";
import { errorHandler } from "./middleware/errorHandler";

import userRoutes from "./routes/user.routes";
import authRoutes from "./routes/auth";
import adminRoutes from "./routes/admin";
import "./events/auth.events";
import "./events/admin.events";

const app = express();

app.use(express.json());

app.use(correlationId);
app.use(logger);

app.use("/api/v1/auth", authRoutes);
/*
 * Interactive API documentation.
 *
 * Visit:
 * http://localhost:3000/api-docs
 */
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

/*
 * Raw OpenAPI JSON.
 *
 * Useful for tools that consume OpenAPI directly.
 */
app.get("/api-docs.json", (req, res) => {
  res.json(swaggerSpec);
});

app.get("/health", (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: "API is healthy",
  });
});

app.use("/api/v1/users", userRoutes);

app.use("/api/v1/admin", adminRoutes);

// ============================================================
// 404 HANDLER
// ============================================================
//
// If Express reaches this point, none of our routes matched.
// ============================================================

app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: "NOT_FOUND",
      message: `Route ${req.path} not found`,
    },
  });
});

app.use(errorHandler);

export default app;
