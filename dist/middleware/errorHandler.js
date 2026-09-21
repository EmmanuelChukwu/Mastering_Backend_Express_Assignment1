"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const errorHandler = (err, req, res, next) => {
    const statusCode = err.statusCode || 500;
    console.error(JSON.stringify({
        event: "request_error",
        correlationId: req.correlationId,
        message: err.message,
        statusCode,
        timestamp: new Date().toISOString(),
    }));
    res.status(statusCode).json({
        success: false,
        error: {
            message: statusCode === 500 ? "Internal server error" : err.message,
        },
        correlationId: req.correlationId,
    });
};
exports.default = errorHandler;
