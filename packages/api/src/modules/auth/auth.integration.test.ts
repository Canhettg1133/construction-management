import { describe, expect, it, vi } from "vitest";
import request from "supertest";
import { buildAuthCookie, buildTestUser } from "../../test/request-test-helpers";

process.env.DATABASE_URL = process.env.DATABASE_URL ?? "mysql://test:test@localhost:3306/test";
process.env.JWT_SECRET = process.env.JWT_SECRET ?? "test-jwt-secret-test-jwt-secret-123";
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET ?? "test-refresh-secret-test-refresh-secret-123";
process.env.NODE_ENV = "test";

vi.mock("./auth.service", () => ({
  authService: {
    login: vi.fn(),
    forgotPassword: vi.fn().mockResolvedValue(undefined),
    resetPassword: vi.fn(),
    changePassword: vi.fn(),
    verifyRefreshToken: vi.fn(),
    generateAccessToken: vi.fn(),
  },
}));

vi.mock("./auth.repository", () => ({
  authRepository: {
    findById: vi.fn().mockResolvedValue(buildTestUser("ENGINEER")),
  },
}));

const { default: app } = await import("../../app");

describe("Auth - request contract", () => {
  it("POST /auth/login rejects invalid email format", async () => {
    const res = await request(app).post("/api/v1/auth/login").send({ email: "not-an-email", password: "password123" });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("POST /auth/login rejects empty password", async () => {
    const res = await request(app).post("/api/v1/auth/login").send({ email: "admin@example.com", password: "" });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("POST /auth/forgot-password returns success for unknown email", async () => {
    const res = await request(app).post("/api/v1/auth/forgot-password").send({ email: "nobody@example.com" });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it("POST /auth/forgot-password rejects invalid email format", async () => {
    const res = await request(app).post("/api/v1/auth/forgot-password").send({ email: "bad-format" });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("POST /auth/reset-password rejects token < 1 char", async () => {
    const res = await request(app).post("/api/v1/auth/reset-password").send({ token: "", newPassword: "NewPass123" });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("POST /auth/reset-password rejects weak password", async () => {
    const res = await request(app).post("/api/v1/auth/reset-password").send({ token: "somevalidtoken123", newPassword: "short" });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("POST /auth/change-password requires authentication", async () => {
    const res = await request(app)
      .post("/api/v1/auth/change-password")
      .send({ currentPassword: "OldPass123", newPassword: "NewPass123" });

    expect(res.status).toBe(401);
  });

  it("POST /auth/change-password validates newPassword complexity", async () => {
    const res = await request(app)
      .post("/api/v1/auth/change-password")
      .set("Cookie", buildAuthCookie("ADMIN"))
      .send({ currentPassword: "OldPass123", newPassword: "weak" });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("GET /auth/me requires authentication", async () => {
    const res = await request(app).get("/api/v1/auth/me");
    expect(res.status).toBe(401);
  });

  it("GET /auth/me returns the current user shape", async () => {
    const res = await request(app).get("/api/v1/auth/me").set("Cookie", buildAuthCookie("ENGINEER"));

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toMatchObject({
      id: "engineer-user",
      email: "engineer@construction.local",
      systemRole: "STAFF",
    });
  });

  it("POST /auth/logout clears cookies", async () => {
    const res = await request(app).post("/api/v1/auth/logout").set("Cookie", buildAuthCookie("ADMIN"));

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it("POST /auth/refresh without refresh_token returns 401", async () => {
    const res = await request(app).post("/api/v1/auth/refresh");
    expect(res.status).toBe(401);
  });
});
