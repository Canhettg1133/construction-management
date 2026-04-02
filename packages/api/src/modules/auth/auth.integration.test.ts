import { describe, expect, it } from "vitest";
import request from "supertest";

process.env.DATABASE_URL = process.env.DATABASE_URL ?? "mysql://test:test@localhost:3306/test";
process.env.JWT_SECRET = process.env.JWT_SECRET ?? "test-jwt-secret-test-jwt-secret-123";
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET ?? "test-refresh-secret-test-refresh-secret-123";
process.env.NODE_ENV = "test";

const { default: app } = await import("../../app");

function signToken(role = "ADMIN") {
  const jwt = require("jsonwebtoken") as typeof import("jsonwebtoken");
  return jwt.sign(
    { id: "u-test", email: "test@example.com", role },
    process.env.JWT_SECRET as string,
    { expiresIn: "1h" }
  );
}

describe("Auth — A1 User & Role flows", () => {
  it("POST /auth/login rejects invalid email format", async () => {
    const res = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "not-an-email", password: "password123" });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("POST /auth/login rejects empty password", async () => {
    const res = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "admin@example.com", password: "" });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("POST /auth/forgot-password returns success for non-existent email", async () => {
    const res = await request(app)
      .post("/api/v1/auth/forgot-password")
      .send({ email: "nobody@example.com" });

    // Security: do not leak whether email exists
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it("POST /auth/forgot-password rejects invalid email format", async () => {
    const res = await request(app)
      .post("/api/v1/auth/forgot-password")
      .send({ email: "bad-format" });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("POST /auth/reset-password rejects token < 1 char", async () => {
    const res = await request(app)
      .post("/api/v1/auth/reset-password")
      .send({ token: "", newPassword: "NewPass123" });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("POST /auth/reset-password rejects weak password (too short)", async () => {
    const res = await request(app)
      .post("/api/v1/auth/reset-password")
      .send({ token: "somevalidtoken123", newPassword: "short" });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("POST /auth/reset-password rejects weak password (no uppercase)", async () => {
    const res = await request(app)
      .post("/api/v1/auth/reset-password")
      .send({ token: "somevalidtoken123", newPassword: "nouppercase123" });

    expect(res.status).toBe(400);
  });

  it("POST /auth/reset-password rejects weak password (no number)", async () => {
    const res = await request(app)
      .post("/api/v1/auth/reset-password")
      .send({ token: "somevalidtoken123", newPassword: "NoNumbersHere" });

    expect(res.status).toBe(400);
  });

  it("POST /auth/change-password requires authentication", async () => {
    const res = await request(app)
      .post("/api/v1/auth/change-password")
      .send({ currentPassword: "OldPass123", newPassword: "NewPass123" });

    expect(res.status).toBe(401);
  });

  it("POST /auth/change-password validates newPassword complexity", async () => {
    const token = signToken("ADMIN");
    const res = await request(app)
      .post("/api/v1/auth/change-password")
      .set("Cookie", [`access_token=${token}`])
      .send({ currentPassword: "OldPass123", newPassword: "weak" });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("GET /auth/me requires authentication", async () => {
    const res = await request(app).get("/api/v1/auth/me");
    expect(res.status).toBe(401);
  });

  it("GET /auth/me returns user when authenticated", async () => {
    const token = signToken("SITE_ENGINEER");
    const res = await request(app)
      .get("/api/v1/auth/me")
      .set("Cookie", [`access_token=${token}`]);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toMatchObject({
      id: "u-test",
      email: "test@example.com",
      role: "SITE_ENGINEER",
    });
  });

  it("POST /auth/logout clears cookies", async () => {
    const token = signToken("ADMIN");
    const res = await request(app)
      .post("/api/v1/auth/logout")
      .set("Cookie", [`access_token=${token}`]);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it("POST /auth/refresh without refresh_token returns 401", async () => {
    const res = await request(app).post("/api/v1/auth/refresh");
    expect(res.status).toBe(401);
  });
});
