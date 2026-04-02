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

const PROJECT_ID = "11111111-1111-1111-1111-111111111111";

describe("Projects — A2 Project & Members (UAT)", () => {
  it("GET /projects requires authentication", async () => {
    const res = await request(app).get("/api/v1/projects");
    expect(res.status).toBe(401);
  });

  it("GET /projects returns project list for authenticated user", async () => {
    const token = signToken("SITE_ENGINEER");
    const res = await request(app)
      .get("/api/v1/projects")
      .set("Cookie", [`access_token=${token}`]);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.meta).toBeDefined();
  });

  it("GET /projects/:id requires authentication", async () => {
    const res = await request(app)
      .get(`/api/v1/projects/${PROJECT_ID}`);

    expect(res.status).toBe(401);
  });

  it("POST /projects requires ADMIN role", async () => {
    const token = signToken("SITE_ENGINEER");
    const res = await request(app)
      .post("/api/v1/projects")
      .set("Cookie", [`access_token=${token}`])
      .send({
        code: "TEST-01",
        name: "Test Project",
        location: "Hanoi",
        startDate: "2025-01-01",
      });

    expect(res.status).toBe(403);
  });

  it("POST /projects validates required fields", async () => {
    const token = signToken("ADMIN");
    const res = await request(app)
      .post("/api/v1/projects")
      .set("Cookie", [`access_token=${token}`])
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
    expect(res.body.error.details).toBeDefined();
  });

  it("POST /projects validates code format (alphanumeric + dash only)", async () => {
    const token = signToken("ADMIN");
    const res = await request(app)
      .post("/api/v1/projects")
      .set("Cookie", [`access_token=${token}`])
      .send({
        code: "invalid code!@#",
        name: "Test",
        location: "Hanoi",
        startDate: "2025-01-01",
      });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("POST /projects validates endDate >= startDate", async () => {
    const token = signToken("ADMIN");
    const res = await request(app)
      .post("/api/v1/projects")
      .set("Cookie", [`access_token=${token}`])
      .send({
        code: "TEST-END",
        name: "Test",
        location: "Hanoi",
        startDate: "2025-06-01",
        endDate: "2025-01-01",
      });

    expect(res.status).toBe(400);
  });

  it("PATCH /projects/:id requires ADMIN or PROJECT_MANAGER", async () => {
    const token = signToken("VIEWER");
    const res = await request(app)
      .patch(`/api/v1/projects/${PROJECT_ID}`)
      .set("Cookie", [`access_token=${token}`])
      .send({ name: "Updated Name" });

    expect(res.status).toBe(403);
  });

  it("PATCH /projects/:id allows PROJECT_MANAGER", async () => {
    const token = signToken("PROJECT_MANAGER");
    const res = await request(app)
      .patch(`/api/v1/projects/${PROJECT_ID}`)
      .set("Cookie", [`access_token=${token}`])
      .send({ name: "Updated by PM" });

    // 404 because project doesn't exist in test DB, but not 403
    expect(res.status).not.toBe(403);
  });
});
