import express, { Request, Response } from "express";
import helmet from 'helmet';
import cors from 'cors';

import swaggerUi from "swagger-ui-express";
import { swaggerSpec } from "./config/swagger";
import { verifyWebhookSignature } from "./middleware/verifyWebhook";
import correlationId from "./middleware/correlationId";
import logger from "./middleware/logger";
import { errorHandler } from "./middleware/errorHandler";
import {
  authLimiter,
  apiLimiter,
  uploadLimiter,
  chatLimiter,
} from "./middleware/rateLimiter";
import { sanitizeInput } from './middleware/sanitize';

import userRoutes from "./routes/user.routes";
import authRoutes from "./routes/auth";
import adminRoutes from "./routes/admin";
import documentRoutes from "./routes/document.routes";
import conversationRoutes from "./routes/conversation.routes";
import { bullBoardAdapter } from "./config/bull-board";
import "./events/auth.events";
import "./events/document.events";
import "./events/admin.events";
import "./events/cache.events";
import './events/security.events';
import "./queues/document.worker";

const app = express();

// Capture raw body for webhook routes BEFORE express.json()
const secret = process.env.WEBHOOK_SECRET;

if (secret) {
  app.use(
    "/webhooks",
    verifyWebhookSignature(secret, "x-signature"),
    express.raw({
      type: "application/json",
      verify: (req: any, res, buf) => {
        req.rawBody = buf;
      },
    }),
  );
} else {
  // Mount raw body parsing but skip verification when secret is not set
  // This keeps dev experience working while avoiding a runtime type error.
  // In production you should set WEBHOOK_SECRET and enable verification.
  // eslint-disable-next-line no-console
  console.warn(
    "WEBHOOK_SECRET not set — webhooks mounted without signature verification",
  );
  app.use(
    "/webhooks",
    express.raw({
      type: "application/json",
      verify: (req: any, res, buf) => {
        req.rawBody = buf;
      },
    }),
  );
}

app.use(express.json());
app.use(sanitizeInput);
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'none'"],
      scriptSrc: ["'none'"],
      styleSrc: ["'none'"],
      imgSrc: ["'none'"],
      connectSrc: ["'self'"],
      // Allow Swagger UI if you serve it
      // scriptSrc: ["'self'", "'unsafe-inline'"],
      // styleSrc: ["'self'", "'unsafe-inline'"],
    },
  },
}));

const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:3001',
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, server-to-server)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`Origin ${origin} not allowed by CORS`));
    }
  },
  credentials: true,  // Allow cookies/auth headers
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'PUT'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400, // Cache preflight requests for 24 hours
}));



app.use(correlationId);
app.use(logger);

app.use("/api/v1/auth", authLimiter, authRoutes);
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

app.use("/api/v1/users", apiLimiter, userRoutes);

app.use("/api/v1/admin", apiLimiter, adminRoutes);

app.use("/api/v1/documents", uploadLimiter, documentRoutes);
app.use("/api/v1/conversations", chatLimiter, conversationRoutes);

// Mount the dashboard (protect with auth in production)
app.use("/admin/queues", bullBoardAdapter.getRouter());

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
