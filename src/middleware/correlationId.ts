import crypto from "crypto";
import { Request, Response, NextFunction } from "express";

const correlationId = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const id = (req.headers["x-correlation-id"] as string) || crypto.randomUUID();

  req.correlationId = id;
  res.setHeader("x-correlation-id", id);

  next();
};

export default correlationId;
