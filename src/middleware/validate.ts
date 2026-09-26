import { Request, Response, NextFunction } from "express";
import { z } from "zod";

/*
 * The validation middleware receives three possible
 * sections of an HTTP request:
 *
 * body
 * query
 * params
 *
 * We use `any` here specifically because the generic
 * validator does not need to know the exact shape of
 * the data.
 *
 * The individual Zod schemas are responsible for that.
 */
type RequestData = {
  body?: any;
  query?: any;
  params?: any;
};

/*
 * Generic validation middleware.
 *
 * This allows us to reuse the same middleware:
 *
 * validate(registerSchema)
 * validate(loginSchema)
 * validate(refreshSchema)
 * validate(createDocumentSchema)
 * ...
 */
export function validate(
  schema: z.ZodType<RequestData>
) {
  return (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    /*
     * Give Zod the relevant parts of the HTTP request.
     */
    const result = schema.safeParse({
      body: req.body,
      query: req.query,
      params: req.params,
    });

    /*
     * Validation failed.
     *
     * Stop the request here and return a 400 response.
     */
    if (!result.success) {
      const errors = result.error.issues.map((issue) => ({
        /*
         * Example:
         *
         * ["body", "email"]
         *
         * becomes:
         *
         * "email"
         */
        field:
          issue.path.slice(1).join(".") || "request",

        message: issue.message,
      }));

      return res.status(400).json({
        success: false,

        error: {
          code: "VALIDATION_ERROR",
          message: "Request validation failed",
          details: errors,
        },
      });
    }

    /*
     * Validation succeeded.
     *
     * We now replace the original request data with
     * Zod's validated/transformed data.
     *
     * This is important because Zod can transform values.
     *
     * Example:
     *
     * "  TEST@Example.COM "
     *
     * becomes:
     *
     * "test@example.com"
     */
    if (result.data.body !== undefined) {
      req.body = result.data.body;
    }

    if (result.data.query !== undefined) {
      req.query = result.data.query;
    }

    if (result.data.params !== undefined) {
      req.params = result.data.params;
    }

    /*
     * Everything passed validation.
     *
     * Continue to the controller.
     */
    next();
  };
}