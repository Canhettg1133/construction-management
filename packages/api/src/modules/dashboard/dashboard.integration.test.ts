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

describe("Dashboard — Regression", () => {
  it("GET /dashboard/stats requires authentication", async () => {
    const res = await request(app).get("/api/v1/dashboard/stats");
    expect(res.status).toBe(401);
  });

  it("GET /dashboard/stats returns stats for authenticated user", async () => {
    const token = signToken("VIEWER");
    const res = await request(app)
      .get("/api/v1/dashboard/stats")
      .set("Cookie", [`access_token=${token}`]);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toMatchObject({
      projectCount: expect.any(Number),
      activeProjectCount: expect.any(Number),
      openTaskCount: expect.any(Number),
      overdueTaskCount: expect.any(Number),
      todayReportCount: expect.any(Number),
      memberCount: expect.any(Number),
      tasksByStatus: expect.any(Object),
      recentActivity: expect.any(Array),
      updatedAt: expect.any(String),
    });
  });

  it("Dashboard stats format is consistent between roles", async () => {
    for (const role of ["ADMIN", "PROJECT_MANAGER", "SITE_ENGINEER", "VIEWER"]) {
      const token = signToken(role);
      const res = await request(app)
        .get("/api/v1/dashboard/stats")
        .set("Cookie", [`access_token=${token}`]);

      expect(res.status).toBe(200);
      expect(res.body.data.tasksByStatus).toHaveProperty("TO_DO");
      expect(res.body.data.tasksByStatus).toHaveProperty("IN_PROGRESS");
      expect(res.body.data.tasksByStatus).toHaveProperty("DONE");
      expect(res.body.data.tasksByStatus).toHaveProperty("CANCELLED");
    }
  });
});

describe("Health — Regression (AC-6.2)", () => {
  it("GET /health is publicly accessible", async () => {
    const res = await request(app).get("/api/v1/health");

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe("ok");
    expect(res.body.data.service).toBe("construction-api");
    expect(res.body.data.timestamp).toBeDefined();
  });
});

describe("404 Handler — Regression", () => {
  it("Unknown routes return 404 with NOT_FOUND code", async () => {
    const res = await request(app).get("/api/v1/nonexistent-endpoint");

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe("NOT_FOUND");
  });
});
