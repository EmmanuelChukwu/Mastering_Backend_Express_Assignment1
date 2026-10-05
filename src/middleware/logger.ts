import { Request, Response, NextFunction } from "express";
import { logger } from "../lib/logger";

const requestLogger = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const start = Date.now();

  logger.info("request_started", {
    correlationId: (req as any).correlationId,
    method: req.method,
    path: req.originalUrl,
    timestamp: new Date().toISOString(),
  });

  res.on("finish", () => {
    logger.info("request_completed", {
      correlationId: (req as any).correlationId,
      method: req.method,
      path: req.originalUrl,
      statusCode: res.statusCode,
      durationMs: Date.now() - start,
      timestamp: new Date().toISOString(),
    });
  });

  next();
};

export default requestLogger;
