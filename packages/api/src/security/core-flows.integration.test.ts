import { describe, expect, it } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";

process.env.DATABASE_URL = process.env.DATABASE_URL ?? "mysql://test:test@localhost:3306/test";
process.env.JWT_SECRET = process.env.JWT_SECRET ?? "test-jwt-secret-test-jwt-secret-123";
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET ?? "test-refresh-secret-test-refresh-secret-123";

const { default: app } = await import("../app");

function signToken(role: "ADMIN" | "PROJECT_MANAGER" | "SITE_ENGINEER" | "VIEWER") {
  return jwt.sign(
    { id: "u-test", email: "test@example.com", role },
    process.env.JWT_SECRET as string,
    { expiresIn: "1h" }
  );
}

describe("Core flow security/integration coverage", () => {
  it("AC-1.2 unauthenticated request to users is rejected", async () => {
    const res = await request(app).get("/api/v1/users");
    expect(res.status).toBe(401);
  });

  it("AC-9.1 viewer cannot access admin users page", async () => {
    const token = signToken("VIEWER");
    const res = await request(app).get("/api/v1/users").set("Cookie", [`access_token=${token}`]);
    expect(res.status).toBe(403);
  });

  it("AC-2.1 report creation requires proper role", async () => {
    const token = signToken("VIEWER");
    const res = await request(app)
      .post("/api/v1/projects/11111111-1111-1111-1111-111111111111/reports")
      .set("Cookie", [`access_token=${token}`])
      .send({});

    expect(res.status).toBe(403);
  });

  it("AC-2.1 report payload is validated before business logic", async () => {
    const token = signToken("ADMIN");
    const res = await request(app)
      .post("/api/v1/projects/11111111-1111-1111-1111-111111111111/reports")
      .set("Cookie", [`access_token=${token}`])
      .send({ weather: "SUNNY" });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("AC-7.2 audit log route requires authentication", async () => {
    const res = await request(app).get("/api/v1/audit-logs");
    expect(res.status).toBe(401);
  });

  it("AC-6.2 health endpoint remains reachable", async () => {
    const res = await request(app).get("/api/v1/health");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
