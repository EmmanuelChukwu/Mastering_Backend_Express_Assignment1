import { describe, it, expect, beforeEach } from "vitest";

import request from "supertest";

import app from "../../src/app";

import { resetDatabase, createTestUser } from "../helpers/setup";

// ============================================================
// REGISTRATION
// ============================================================

describe("POST /api/v1/auth/register", () => {
  beforeEach(async () => {
    // Every test starts with an empty test database.
    await resetDatabase();
  });

  it("creates a user and returns 201", async () => {
    const res = await request(app).post("/api/v1/auth/register").send({
      name: "New User",
      email: "new@example.com",
      password: "SecurePass1",
    });

    expect(res.status).toBe(201);

    expect(res.body.success).toBe(true);

    expect(res.body.data).toHaveProperty("id");

    expect(res.body.data.email).toBe("new@example.com");

    // VERY IMPORTANT:
    // Password hashes must never be returned by the API.
    expect(res.body.data).not.toHaveProperty("passwordHash");
  });

  it("returns 400 for an invalid email", async () => {
    const res = await request(app).post("/api/v1/auth/register").send({
      name: "Test User",
      email: "not-an-email",
      password: "SecurePass1",
    });

    expect(res.status).toBe(400);

    expect(res.body.success).toBe(false);

    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns 409 for a duplicate email", async () => {
    await createTestUser({
      email: "taken@example.com",
    });

    const res = await request(app).post("/api/v1/auth/register").send({
      name: "Another User",
      email: "taken@example.com",
      password: "SecurePass1",
    });

    expect(res.status).toBe(409);
  });
});

// ============================================================
// LOGIN
// ============================================================

describe("POST /api/v1/auth/login", () => {
  beforeEach(async () => {
    await resetDatabase();

    await createTestUser({
      email: "user@example.com",
    });
  });

  it("returns tokens for valid credentials", async () => {
    const res = await request(app).post("/api/v1/auth/login").send({
      email: "user@example.com",
      password: "TestPassword1!",
    });

    expect(res.status).toBe(200);

    expect(res.body.data).toHaveProperty("accessToken");
    expect(res.body.data).toHaveProperty("refreshToken");
  });

  it("returns 401 for a wrong password", async () => {
    const res = await request(app).post("/api/v1/auth/login").send({
      email: "user@example.com",
      password: "WrongPassword1",
    });

    expect(res.status).toBe(401);

    expect(res.body.error.message).toBe("Invalid credentials");
  });

  it("returns 401 for a non-existent email", async () => {
    const res = await request(app).post("/api/v1/auth/login").send({
      email: "nobody@example.com",
      password: "Whatever1",
    });

    expect(res.status).toBe(401);

    expect(res.body.error.message).toBe("Invalid credentials");
  });
});

// ============================================================
// PROTECTED ROUTES
// ============================================================

describe("Protected routes", () => {
  let accessToken: string;

  beforeEach(async () => {
    await resetDatabase();

    await createTestUser({
      email: "user@example.com",
    });

    // Login to obtain a real JWT.
    const login = await request(app).post("/api/v1/auth/login").send({
      email: "user@example.com",
      password: "TestPassword1!",
    });

    accessToken = login.body.data.accessToken;
  });

  it("returns 401 without a token", async () => {
    const res = await request(app).get("/api/v1/users");

    expect(res.status).toBe(401);
  });

  it("returns 200 with a valid token", async () => {
    const res = await request(app)
      .get("/api/v1/users")
      .set("Authorization", `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
  });
});
