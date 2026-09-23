import { prisma } from "../lib/prisma";
import { hashPassword, verifyPassword } from "../lib/password";
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from "../lib/tokens";
import { appEvents } from "../lib/events";
import { AUTH_EVENTS } from "../events/auth.events";
import crypto from "crypto";

// Registers a new user.
//
// Flow:
// Controller/Route
//      ↓
// auth.service.register()
//      ↓
// Check if email exists
//      ↓
// Hash password
//      ↓
// Save user to PostgreSQL
//      ↓
// Return safe user information
export async function register(data: {
  name: string;
  email: string;
  password: string;
}) {
  // Normalize the email so that things like
  // "User@Email.com" and " user@email.com "
  // are treated consistently.
  const email = data.email.toLowerCase().trim();

  // Before creating a user, check whether this email
  // already belongs to an existing account.
  const existing = await prisma.user.findUnique({
    where: { email },
  });

  if (existing) {
    throw new Error("Email already registered");
  }

  // IMPORTANT:
  // We never store the user's actual password.
  //
  // bcrypt turns:
  //     "mypassword123"
  //
  // into something like:
  //     "$2b$12$...."
  //
  // That resulting value is what goes into PostgreSQL.
  const passwordHash = await hashPassword(data.password);

  // Create the actual User record in PostgreSQL.
  const user = await prisma.user.create({
    data: {
      name: data.name,
      email,
      passwordHash,
    },
  });

  // Tell the application that registration succeeded.
  //
  // The auth service doesn't need to know what happens next.
  // Event listeners handle secondary side effects.
  appEvents.emit(AUTH_EVENTS.USER_REGISTERED, {
    id: user.id,
    email: user.email,
    tier: user.tier,
  });

  // Don't return sensitive information such as passwordHash.
  // Only return information the application actually needs.
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    tier: user.tier,
  };
}

export async function login(data: {
  email: string;
  password: string;
  deviceInfo?: string;
}) {
  // Normalize the email before looking it up.
  const email = data.email.toLowerCase().trim();

  // Find the account.
  const user = await prisma.user.findUnique({
    where: { email },
  });

  // We deliberately use the SAME error for:
  // - email doesn't exist
  // - account is inactive
  //
  // This prevents attackers from easily discovering
  // which email addresses have accounts.
  if (!user || !user.isActive) {
    appEvents.emit(AUTH_EVENTS.LOGIN_FAILED, {
      email,
      deviceInfo: data.deviceInfo,
    });

    throw new Error("Invalid credentials");
  }

  // Compare the password the user just entered
  // against the bcrypt hash stored in PostgreSQL.
  //
  // We do NOT hash the password ourselves and compare
  // two strings with ===.
  const valid = await verifyPassword(data.password, user.passwordHash);

  if (!valid) {
    appEvents.emit(AUTH_EVENTS.LOGIN_FAILED, {
      email,
      deviceInfo: data.deviceInfo,
    });

    throw new Error("Invalid credentials");
  }

  // Password is correct.
  //
  // Now create the two tokens:
  //
  // Access token  → used to access protected API routes
  // Refresh token → used to obtain a new access token later
  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);

  // We don't store the raw refresh token in the database.
  //
  // Instead:
  //
  // refresh token
  //      ↓
  // SHA-256
  //      ↓
  // token hash
  //
  // The hash is what gets stored.
  const tokenHash = crypto
    .createHash("sha256")
    .update(refreshToken)
    .digest("hex");

  // Store the hashed refresh token so that the server
  // can later check whether the token is still valid/revoked.
  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      token: tokenHash,

      // Refresh tokens are valid for 7 days.
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  appEvents.emit(AUTH_EVENTS.USER_LOGGED_IN, {
    userId: user.id,
    deviceInfo: data.deviceInfo,
  });

  // Send the actual tokens to the client.
  //
  // The client needs the RAW refresh token because
  // it will send it back to us later.
  return {
    accessToken,
    refreshToken,

    // Return safe user information.
    // Never return passwordHash.
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      tier: user.tier,
    },
  };
}

export async function refresh(rawRefreshToken: string) {
  // STEP 1: Verify that the refresh token is a valid JWT.
  //
  // This checks things such as:
  // - Was the token signed with our refresh-token secret?
  // - Has the JWT expired?
  // - Is the token structurally valid?
  let payload;

  try {
    payload = verifyRefreshToken(rawRefreshToken);
  } catch {
    throw new Error("Invalid refresh token");
  }

  // STEP 2: Make sure an ACCESS token wasn't supplied
  // where a REFRESH token was expected.
  //
  // Both are JWTs, so we use the "type" field to distinguish them.
  if (payload.type !== "refresh") {
    throw new Error("Invalid token type");
  }

  // STEP 3: Hash the raw token.
  //
  // The database contains only the hash, not the raw token.
  // So we hash the incoming token again and search for that hash.
  const tokenHash = crypto
    .createHash("sha256")
    .update(rawRefreshToken)
    .digest("hex");

  // STEP 4: Look for the token in our database.
  //
  // If it was logged out/revoked, it won't be here anymore.
  const stored = await prisma.refreshToken.findUnique({
    where: { token: tokenHash },
  });

  // STEP 5: Check that the database record exists
  // and that the token hasn't expired.
  if (!stored || stored.expiresAt < new Date()) {
    throw new Error("Refresh token expired or revoked");
  }

  // STEP 6: Find the user associated with this token.
  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
  });

  if (!user || !user.isActive) {
    throw new Error("User not found or inactive");
  }

  // STEP 7: ROTATE the refresh token.
  //
  // We delete the old refresh token first.
  // This means the old token cannot be reused.
  await prisma.refreshToken.delete({
    where: { token: tokenHash },
  });

  // STEP 8: Generate a completely new pair of tokens.
  const newAccessToken = generateAccessToken(user);
  const newRefreshToken = generateRefreshToken(user);

  // STEP 9: Hash the new refresh token before storing it.
  const newHash = crypto
    .createHash("sha256")
    .update(newRefreshToken)
    .digest("hex");

  // STEP 10: Store the new refresh token.
  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      token: newHash,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  appEvents.emit(AUTH_EVENTS.TOKEN_REFRESHED, {
    userId: user.id,
  });

  // The client receives the NEW tokens.
  return {
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
  };
}

export async function logout(rawRefreshToken: string) {
  let payload;

  try {
    payload = verifyRefreshToken(rawRefreshToken);
  } catch {
    // Even if the JWT is invalid/expired, there is nothing useful
    // to revoke. Treat logout as completed from the client's perspective.
    return;
  }

  const tokenHash = crypto
    .createHash("sha256")
    .update(rawRefreshToken)
    .digest("hex");

  await prisma.refreshToken.deleteMany({
    where: { token: tokenHash },
  });

  appEvents.emit(AUTH_EVENTS.USER_LOGGED_OUT, {
    userId: payload.sub,
  });
}
