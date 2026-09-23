import { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "../lib/tokens";


export function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
) {
  // The client should send:
  //
  // Authorization: Bearer <access-token>
  //
  const header = req.headers.authorization;

  // No Authorization header, or wrong format.
  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({
      error: "No token provided",
    });
  }

  // Remove "Bearer " and keep only the actual JWT.
  const token = header.split(" ")[1];

  try {
    // Verify the JWT's signature and expiration.
    const payload = verifyAccessToken(token);

    // Make sure this is actually an ACCESS token.
    //
    // Remember: our refresh tokens are also JWTs.
    if (payload.type !== "access") {
      return res.status(401).json({
        error: "Invalid token type",
      });
    }

    // Attach the authenticated user's identity to the request.
    //
    // Controllers later in the request pipeline can now use:
    //
    // req.user.id
    // req.user.role
    req.user = {
      id: payload.sub,
      role: payload.role,
    };

    // Authentication succeeded.
    // Continue to the next middleware/controller.
    next();
  } catch (error: any) {
    // JWT has a specific error when its expiration time has passed.
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        error: "Token expired",
      });
    }

    // Any other verification failure means the token isn't valid.
    return res.status(401).json({
      error: "Invalid token",
    });
  }
}

export function authorize(...allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    // authenticate() should normally run before authorize().
    //
    // If there is no authenticated user, we cannot check
    // their permissions.
    if (!req.user) {
      return res.status(401).json({
        error: "Not authenticated",
      });
    }

    // The user is authenticated, but their role/tier
    // isn't allowed to access this particular route.
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: "Insufficient permissions",
      });
    }

    // User is authenticated AND authorized.
    next();
  };
}