import { describe, expect, it, vi } from "vitest";
import request from "supertest";
import { buildAuthCookie } from "../../test/request-test-helpers";

process.env.DATABASE_URL = process.env.DATABASE_URL ?? "mysql://test:test@localhost:3306/test";
process.env.JWT_SECRET = process.env.JWT_SECRET ?? "test-jwt-secret-test-jwt-secret-123";
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET ?? "test-refresh-secret-test-refresh-secret-123";
process.env.NODE_ENV = "test";

vi.mock("./dashboard.service", () => ({
  dashboardService: {
    getStats: vi.fn().mockResolvedValue({
      projectCount: 1,
      activeProjectCount: 1,
      openTaskCount: 2,
      overdueTaskCount: 0,
      todayReportCount: 1,
      memberCount: 5,
      tasksByStatus: {
        TO_DO: 1,
        IN_PROGRESS: 1,
        DONE: 0,
        CANCELLED: 0,
      },
      recentActivity: [],
      updatedAt: "2026-04-14T00:00:00.000Z",
    }),
  },
}));

const { default: app } = await import("../../app");

describe("Dashboard - request contract", () => {
  it("GET /dashboard/stats requires authentication", async () => {
    const res = await request(app).get("/api/v1/dashboard/stats");
    expect(res.status).toBe(401);
  });

  it("GET /dashboard/stats returns stats for authenticated user", async () => {
    const res = await request(app).get("/api/v1/dashboard/stats").set("Cookie", buildAuthCookie("STAFF"));

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

  it("Dashboard stats shape is consistent for ADMIN and STAFF", async () => {
    for (const profile of ["ADMIN", "STAFF"] as const) {
      const res = await request(app).get("/api/v1/dashboard/stats").set("Cookie", buildAuthCookie(profile));

      expect(res.status).toBe(200);
      expect(res.body.data.tasksByStatus).toHaveProperty("TO_DO");
      expect(res.body.data.tasksByStatus).toHaveProperty("IN_PROGRESS");
      expect(res.body.data.tasksByStatus).toHaveProperty("DONE");
      expect(res.body.data.tasksByStatus).toHaveProperty("CANCELLED");
    }
  });
});

describe("Health - regression", () => {
  it("GET /health is publicly accessible", async () => {
    const res = await request(app).get("/api/v1/health");

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe("ok");
    expect(res.body.data.service).toBe("construction-api");
    expect(res.body.data.timestamp).toBeDefined();
  });
});

describe("404 handler - regression", () => {
  it("Unknown routes return 404 with NOT_FOUND code", async () => {
    const res = await request(app).get("/api/v1/nonexistent-endpoint");

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe("NOT_FOUND");
  });
});
