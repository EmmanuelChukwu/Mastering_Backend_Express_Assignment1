import { describe, it, expect, vi, beforeEach } from "vitest";

import * as authService from "../auth.service";
import { prisma } from "../../lib/prisma";

// ============================================================
// MOCK PRISMA
// ============================================================
//
// The service normally talks to PostgreSQL through Prisma.
//
// We DON'T want our unit test touching PostgreSQL.
//
// Instead, these Prisma methods become fake functions that
// return whatever values we tell them to return.
// ============================================================

vi.mock("../../lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },

    refreshToken: {
      create: vi.fn(),
      findUnique: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },

    role: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
    },

    userRole: {
      create: vi.fn(),
    },
  },
}));

// ============================================================
// MOCK EVENTS
// ============================================================
//
// Registering a user may emit an application event.
//
// We don't want that event triggering other parts of the
// application during a unit test.
//
// So we replace emit() with a fake function.
// ============================================================

vi.mock("../../lib/events", () => ({
  appEvents: {
    emit: vi.fn(),
    on: vi.fn(),
    setMaxListeners: vi.fn(),
  },
}));

describe("auth.service.register", () => {
  beforeEach(() => {
    // Reset call history and mock state before every test.
    vi.clearAllMocks();
  });

  it("creates a user with a hashed password", async () => {
    // No existing user with this email.
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

    // Pretend Prisma successfully creates the user.
    vi.mocked(prisma.user.create).mockResolvedValue({
      id: "uuid-1",
      name: "Test User",
      email: "test@example.com",
      tier: "free",
      role: "user",
      isActive: true,
      deletedAt: null,
      passwordHash: "$2b$12$fake-hash",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await authService.register({
      name: "Test User",
      email: "test@example.com",
      password: "SecurePass1",
    });

    // Verify that Prisma was asked to create the correct kind
    // of object.
    //
    // We don't care about the exact hash because bcrypt
    // generates a different hash each time.
    expect(prisma.user.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        name: "Test User",
        email: "test@example.com",

        // This proves we are NOT storing the plain password.
        passwordHash: expect.stringMatching(/^\$2[aby]\$/),
      }),
    });

    // The password hash must never be returned to the client.
    expect(result).not.toHaveProperty("passwordHash");

    expect(result).toHaveProperty("id");
    expect(result).toHaveProperty("email");
  });

  it("throws when the email already exists", async () => {
    // Pretend Prisma found an existing user.
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: "existing-user",
      name: "Existing User",
      email: "taken@example.com",
      passwordHash: "hash",
      role: "user",
      tier: "free",
      isActive: true,
      deletedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await expect(
      authService.register({
        name: "New User",
        email: "taken@example.com",
        password: "SecurePass1",
      }),
    ).rejects.toThrow("Email already registered");
  });
});

describe("auth.service.login", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns tokens for valid credentials", async () => {
    // We need a REAL bcrypt hash here because the service
    // actually compares the supplied password against it.
    const bcrypt = await import("bcryptjs");

    const hash = await bcrypt.hash("SecurePass1", 4);

    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: "uuid-1",
      name: "Test User",
      email: "test@example.com",
      tier: "free",
      role: "user",
      isActive: true,
      deletedAt: null,
      passwordHash: hash,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // The service also creates a refresh-token record.
    vi.mocked(prisma.refreshToken.create).mockResolvedValue({
      id: "refresh-token-id",
      userId: "uuid-1",
      token: "fake-token-hash",
      expiresAt: new Date(Date.now() + 86400000),
      createdAt: new Date(),
    });

    const result = await authService.login({
      email: "test@example.com",
      password: "SecurePass1",
    });

    expect(result).toHaveProperty("accessToken");
    expect(result).toHaveProperty("refreshToken");
    expect(result.user.email).toBe("test@example.com");
  });

  it("throws for a wrong password", async () => {
    const bcrypt = await import("bcryptjs");

    const hash = await bcrypt.hash("RealPassword1", 4);

    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: "uuid-1",
      name: "Test User",
      email: "test@example.com",
      tier: "free",
      role: "user",
      isActive: true,
      passwordHash: hash,
      deletedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await expect(
      authService.login({
        email: "test@example.com",
        password: "WrongPassword1",
      }),
    ).rejects.toThrow("Invalid credentials");
  });

  it("throws the same error for a non-existent user", async () => {
    // Pretend the email doesn't exist.
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

    await expect(
      authService.login({
        email: "nobody@example.com",
        password: "Whatever1",
      }),
    ).rejects.toThrow("Invalid credentials");
  });
});
