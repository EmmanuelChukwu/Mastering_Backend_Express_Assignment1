"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const logger = (req, res, next) => {
    const start = Date.now();
    console.log(JSON.stringify({
        event: "request_started",
        correlationId: req.correlationId,
        method: req.method,
        path: req.originalUrl,
        timestamp: new Date().toISOString(),
    }));
    res.on("finish", () => {
        console.log(JSON.stringify({
            event: "request_completed",
            correlationId: req.correlationId,
            method: req.method,
            path: req.originalUrl,
            statusCode: res.statusCode,
            durationMs: Date.now() - start,
            timestamp: new Date().toISOString(),
        }));
    });
    next();
};
exports.default = logger;
