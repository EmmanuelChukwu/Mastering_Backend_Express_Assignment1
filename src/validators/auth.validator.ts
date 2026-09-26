import { z } from "zod";

/*
 * REGISTER
 *
 * We validate the BODY of the request.
 *
 * Incoming:
 * POST /api/v1/auth/register
 *
 * {
 *   "email": " Student@Example.com ",
 *   "password": "Password123"
 * }
 *
 * Zod will:
 * 1. Check that email is actually an email.
 * 2. Trim whitespace.
 * 3. Convert the email to lowercase.
 * 4. Check password requirements.
 */
export const registerSchema = z.object({
  body: z.object({
    name: z
      .string()
      .trim()
      .min(2, "Name must be at least 2 characters")
      .max(100, "Name cannot exceed 100 characters"),

    email: z
      .string()
      .trim()
      .toLowerCase()
      .pipe(z.email("Must be a valid email")),

    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .max(128, "Password cannot exceed 128 characters")
      .regex(/[A-Z]/, "Must contain an uppercase letter")
      .regex(/[0-9]/, "Must contain a number"),
  }),
});

/*
 * LOGIN
 *
 * Login doesn't need all the password-strength rules.
 *
 * Why?
 *
 * Registration asks:
 * "Is this a password we're willing to create?"
 *
 * Login asks:
 * "Did the user provide a password?"
 *
 * bcrypt will determine whether it matches.
 */
export const loginSchema = z.object({
  body: z.object({
    email: z
      .string()
      .trim()
      .toLowerCase()
      .pipe(z.email("Must be a valid email")),

    password: z.string().min(1, "Password is required"),
  }),
});

/*
 * REFRESH TOKEN
 *
 * The refresh endpoint expects a refreshToken
 * in the request body.
 */
export const refreshSchema = z.object({
  body: z.object({
    refreshToken: z.string().min(1, "Refresh token is required"),
  }),
});

/*
 * LOGOUT uses the same shape as refresh.
 */
export const logoutSchema = z.object({
  body: z.object({
    refreshToken: z.string().min(1, "Refresh token is required"),
  }),
});
