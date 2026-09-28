import {
  Request,
  Response,
  NextFunction,
} from "express";

import { getUserPermissions } from "../services/rbac.service";
import { ForbiddenError } from "../lib/errors";

/*
 * Authorization middleware factory.
 *
 * Usage:
 *
 * requirePermission("documents:read")
 *
 * or:
 *
 * requirePermission(
 *   "documents:read",
 *   "documents:update"
 * )
 *
 * Authentication answers:
 *     "Who are you?"
 *
 * Authorization answers:
 *     "Are you allowed to do this?"
 */

export function requirePermission(
  ...requiredPermissions: string[]
) {
  return async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      /*
       * authenticate middleware should already have run.
       *
       * If req.user doesn't exist, something is wrong with
       * the middleware chain.
       */
      if (!req.user) {
        throw new ForbiddenError("Not authenticated");
      }

      // Load all permissions belonging to this user.
      const userPermissions =
        await getUserPermissions(req.user.id);

      /*
       * Check every permission required by the route.
       *
       * ALL required permissions must exist.
       */
      const missing = requiredPermissions.filter(
        (permission) =>
          !userPermissions.has(permission)
      );

      if (missing.length > 0) {
        throw new ForbiddenError(
          "You do not have the required permission."
        );
      }

      // User has everything required.
      next();
    } catch (error) {
      next(error);
    }
  };
}