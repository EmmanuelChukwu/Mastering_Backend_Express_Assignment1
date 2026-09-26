// ============================================================
// BASE APPLICATION ERROR
// ============================================================
//
// JavaScript's normal Error only gives us a message.
//
// Our API needs more information:
//
// - What HTTP status should we return?
// - What machine-readable error code should the client receive?
// - Is this an expected/operational error?
// - Are there additional details?
//
// AppError gives every application-level error that structure.
// ============================================================

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly isOperational: boolean;
  public readonly details?: unknown;

  constructor(
    message: string,
    statusCode: number,
    code: string,
    details?: unknown
  ) {
    super(message);

    // Makes instanceof AppError and subclasses behave correctly.
    this.name = this.constructor.name;

    this.statusCode = statusCode;
    this.code = code;

    // true means:
    // "We expected this type of failure."
    //
    // The global error handler can safely expose the message.
    this.isOperational = true;

    this.details = details;

    // Preserve the useful stack trace for server-side debugging.
    Error.captureStackTrace(this, this.constructor);
  }
}


// ============================================================
// 400 — VALIDATION ERROR
// ============================================================

export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super(
      message,
      400,
      "VALIDATION_ERROR",
      details
    );
  }
}


// ============================================================
// 401 — UNAUTHORIZED
// ============================================================
//
// The user has not authenticated successfully.
//
// Examples:
// - missing token
// - invalid token
// - wrong login credentials
// ============================================================

export class UnauthorizedError extends AppError {
  constructor(message = "Authentication required") {
    super(
      message,
      401,
      "UNAUTHORIZED"
    );
  }
}


// ============================================================
// 403 — FORBIDDEN
// ============================================================
//
// The user is authenticated but doesn't have permission.
// ============================================================

export class ForbiddenError extends AppError {
  constructor(message = "Access denied") {
    super(
      message,
      403,
      "FORBIDDEN"
    );
  }
}


// ============================================================
// 404 — NOT FOUND
// ============================================================

export class NotFoundError extends AppError {
  constructor(message = "Resource not found") {
    super(
      message,
      404,
      "NOT_FOUND"
    );
  }
}


// ============================================================
// 409 — CONFLICT
// ============================================================
//
// Used when the request conflicts with existing data.
//
// Example:
// Registering with an email that already exists.
// ============================================================

export class ConflictError extends AppError {
  constructor(message: string) {
    super(
      message,
      409,
      "CONFLICT"
    );
  }
}