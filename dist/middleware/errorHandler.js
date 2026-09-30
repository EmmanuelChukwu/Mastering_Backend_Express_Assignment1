"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = errorHandler;
const errors_1 = require("../lib/errors");
// ============================================================
// GLOBAL ERROR HANDLER
// ============================================================
//
// Express recognizes this as error-handling middleware because
// it has FOUR parameters:
//
// err, req, res, next
//
// This middleware should be mounted LAST in app.ts.
//
// Any route/middleware that calls:
//
// next(error)
//
// eventually arrives here.
// ============================================================
function errorHandler(err, _req, res, _next) {
    // ==========================================================
    // EXPECTED / OPERATIONAL ERROR
    // ==========================================================
    //
    // These are failures our application understands.
    //
    // Example:
    //
    // throw new ConflictError("Email already registered");
    //
    // We can safely send the appropriate message/status.
    // ==========================================================
    if (err instanceof errors_1.AppError) {
        console.warn(`[${err.code}] ${err.message}`, err.details ?? "");
        return res.status(err.statusCode).json({
            success: false,
            error: {
                code: err.code,
                message: err.message,
                ...(err.details !== undefined
                    ? { details: err.details }
                    : {}),
            },
        });
    }
    // ==========================================================
    // UNEXPECTED PROGRAMMING ERROR
    // ==========================================================
    //
    // Something went wrong that we didn't deliberately model.
    //
    // IMPORTANT:
    // Don't expose the actual error to the client.
    //
    // It could contain:
    // - database information
    // - filesystem paths
    // - stack traces
    // - internal implementation details
    //
    // Log the actual error server-side.
    // Return a safe generic message to the client.
    // ==========================================================
    console.error("Unhandled error:", err);
    return res.status(500).json({
        success: false,
        error: {
            code: "INTERNAL_ERROR",
            message: "An unexpected error occurred",
        },
    });
}
// Scrub sensitive values from error details before responding
function scrubSensitiveData(data) {
    if (typeof data !== 'string')
        return data;
    const patterns = [
        /Bearer [A-Za-z0-9\-._~+\/]+=*/g, // JWT tokens
        /sk-[A-Za-z0-9]{20,}/g, // OpenAI keys
        /password["']?\s*[:=]\s*["']?[^"'\s,}]+/gi, // password in any format
    ];
    let scrubbed = data;
    for (const pattern of patterns) {
        scrubbed = scrubbed.replace(pattern, '[REDACTED]');
    }
    return scrubbed;
}
