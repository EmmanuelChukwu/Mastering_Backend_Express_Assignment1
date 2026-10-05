"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const logger_1 = require("../lib/logger");
const requestLogger = (req, res, next) => {
    const start = Date.now();
    logger_1.logger.info("request_started", {
        correlationId: req.correlationId,
        method: req.method,
        path: req.originalUrl,
        timestamp: new Date().toISOString(),
    });
    res.on("finish", () => {
        logger_1.logger.info("request_completed", {
            correlationId: req.correlationId,
            method: req.method,
            path: req.originalUrl,
            statusCode: res.statusCode,
            durationMs: Date.now() - start,
            timestamp: new Date().toISOString(),
        });
    });
    next();
};
exports.default = requestLogger;
