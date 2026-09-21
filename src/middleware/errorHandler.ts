import { Request, Response, NextFunction } from "express";

interface HttpError extends Error {
  statusCode?: number;
}

const errorHandler = (
  err: HttpError,
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const statusCode = err.statusCode || 500;

  console.error(
    JSON.stringify({
      event: "request_error",
      correlationId: req.correlationId,
      message: err.message,
      statusCode,
      timestamp: new Date().toISOString(),
    }),
  );

  res.status(statusCode).json({
    success: false,
    error: {
      message: statusCode === 500 ? "Internal server error" : err.message,
    },
    correlationId: req.correlationId,
  });
};

export default errorHandler;
