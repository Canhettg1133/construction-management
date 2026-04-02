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

describe("Users — A1 User & Role (UAT)", () => {
  it("AC-1.2 GET /users rejects unauthenticated", async () => {
    const res = await request(app).get("/api/v1/users");
    expect(res.status).toBe(401);
  });

  it("AC-9.1 VIEWER cannot access user list", async () => {
    const token = signToken("VIEWER");
    const res = await request(app)
      .get("/api/v1/users")
      .set("Cookie", [`access_token=${token}`]);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN");
  });

  it("ADMIN can list users", async () => {
    const token = signToken("ADMIN");
    const res = await request(app)
      .get("/api/v1/users")
      .set("Cookie", [`access_token=${token}`]);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.meta).toBeDefined();
  });

  it("POST /users requires authentication", async () => {
    const res = await request(app)
      .post("/api/v1/users")
      .send({ name: "Test User", email: "test@example.com", password: "TestPass1", role: "VIEWER" });

    expect(res.status).toBe(401);
  });

  it("POST /users validates required fields", async () => {
    const token = signToken("ADMIN");
    const res = await request(app)
      .post("/api/v1/users")
      .set("Cookie", [`access_token=${token}`])
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
    expect(res.body.error.details).toBeDefined();
  });

  it("POST /users validates email format", async () => {
    const token = signToken("ADMIN");
    const res = await request(app)
      .post("/api/v1/users")
      .set("Cookie", [`access_token=${token}`])
      .send({ name: "Test", email: "not-an-email", password: "TestPass1", role: "VIEWER" });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("POST /users validates password complexity", async () => {
    const token = signToken("ADMIN");
    const res = await request(app)
      .post("/api/v1/users")
      .set("Cookie", [`access_token=${token}`])
      .send({ name: "Test", email: "test@example.com", password: "weak", role: "VIEWER" });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("PATCH /users/:id requires ADMIN role", async () => {
    const token = signToken("SITE_ENGINEER");
    const res = await request(app)
      .patch("/api/v1/users/u-test-id")
      .set("Cookie", [`access_token=${token}`])
      .send({ name: "New Name" });

    expect(res.status).toBe(403);
  });

  it("PATCH /users/:id/status requires ADMIN role", async () => {
    const token = signToken("PROJECT_MANAGER");
    const res = await request(app)
      .patch("/api/v1/users/u-test-id/status")
      .set("Cookie", [`access_token=${token}`])
      .send({ isActive: false });

    expect(res.status).toBe(403);
  });

  it("PATCH /users/:id validates isActive field", async () => {
    const token = signToken("ADMIN");
    const res = await request(app)
      .patch("/api/v1/users/u-test-id/status")
      .set("Cookie", [`access_token=${token}`])
      .send({ isActive: "not-a-boolean" });

    expect(res.status).toBe(400);
  });

  it("GET /users/:id requires ADMIN role", async () => {
    const token = signToken("VIEWER");
    const res = await request(app)
      .get("/api/v1/users/u-test-id")
      .set("Cookie", [`access_token=${token}`]);

    expect(res.status).toBe(403);
  });
});
