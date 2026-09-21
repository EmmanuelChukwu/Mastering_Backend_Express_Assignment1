import express, { Request, Response } from "express";

import correlationId from "./middleware/correlationId";
import logger from "./middleware/logger";
import errorHandler from "./middleware/errorHandler";

import userRoutes from "./routes/user.routes";

const app = express();

app.use(express.json());

app.use(correlationId);
app.use(logger);

app.get("/health", (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: "API is healthy",
  });
});

app.use("/api/users", userRoutes);

app.use(errorHandler);

export default app;
