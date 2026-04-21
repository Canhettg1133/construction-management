import { describe, expect, it, vi } from "vitest";
import request from "supertest";
import { buildAuthCookie } from "../../test/request-test-helpers";

process.env.DATABASE_URL = process.env.DATABASE_URL ?? "mysql://test:test@localhost:3306/test";
process.env.JWT_SECRET = process.env.JWT_SECRET ?? "test-jwt-secret-test-jwt-secret-123";
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET ?? "test-refresh-secret-test-refresh-secret-123";
process.env.NODE_ENV = "test";

vi.mock("../../shared/services/permission.service", async () => {
  const { createPermissionServiceMock } = await import("../../test/request-test-helpers");
  return { permissionService: createPermissionServiceMock() };
});

vi.mock("./report.service", () => ({
  reportService: {
    list: vi.fn().mockResolvedValue({ reports: [], total: 0 }),
    getById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateStatus: vi.fn(),
    delete: vi.fn().mockResolvedValue(undefined),
    submitForApproval: vi.fn(),
  },
}));

const { default: app } = await import("../../app");

const PROJECT_ID = "11111111-1111-1111-1111-111111111111";

describe("Daily Reports - request contract", () => {
  it("GET /projects/:projectId/reports requires authentication", async () => {
    const res = await request(app).get(`/api/v1/projects/${PROJECT_ID}/reports`);
    expect(res.status).toBe(401);
  });

  it("GET /projects/:projectId/reports returns list", async () => {
    const res = await request(app)
      .get(`/api/v1/projects/${PROJECT_ID}/reports`)
      .set("Cookie", buildAuthCookie("VIEWER"));

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it("VIEWER cannot create report", async () => {
    const res = await request(app)
      .post(`/api/v1/projects/${PROJECT_ID}/reports`)
      .set("Cookie", buildAuthCookie("VIEWER"))
      .send({
        reportDate: "2025-04-01",
        weather: "SUNNY",
        workerCount: 10,
        workDescription: "Work description",
        progress: 50,
      });

    expect(res.status).toBe(403);
  });

  it("Payload is validated before report create logic", async () => {
    const res = await request(app)
      .post(`/api/v1/projects/${PROJECT_ID}/reports`)
      .set("Cookie", buildAuthCookie("ADMIN"))
      .send({ weather: "SUNNY" });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
    expect(res.body.success).toBe(false);
  });

  it("POST validates weather enum", async () => {
    const res = await request(app)
      .post(`/api/v1/projects/${PROJECT_ID}/reports`)
      .set("Cookie", buildAuthCookie("ADMIN"))
      .send({
        reportDate: "2025-04-01",
        weather: "INVALID_WEATHER",
        workerCount: 10,
        workDescription: "Work",
        progress: 50,
      });

    expect(res.status).toBe(400);
  });

  it("POST validates temperatureMax >= temperatureMin", async () => {
    const res = await request(app)
      .post(`/api/v1/projects/${PROJECT_ID}/reports`)
      .set("Cookie", buildAuthCookie("ADMIN"))
      .send({
        reportDate: "2025-04-01",
        weather: "SUNNY",
        workerCount: 10,
        workDescription: "Work",
        progress: 50,
        temperatureMin: 35,
        temperatureMax: 20,
      });

    expect(res.status).toBe(400);
  });

  it("POST validates progress 0-100", async () => {
    const res = await request(app)
      .post(`/api/v1/projects/${PROJECT_ID}/reports`)
      .set("Cookie", buildAuthCookie("ADMIN"))
      .send({
        reportDate: "2025-04-01",
        weather: "SUNNY",
        workerCount: 10,
        workDescription: "Work",
        progress: 150,
      });

    expect(res.status).toBe(400);
  });

  it("POST validates workerCount non-negative", async () => {
    const res = await request(app)
      .post(`/api/v1/projects/${PROJECT_ID}/reports`)
      .set("Cookie", buildAuthCookie("ADMIN"))
      .send({
        reportDate: "2025-04-01",
        weather: "SUNNY",
        workerCount: -5,
        workDescription: "Work",
        progress: 50,
      });

    expect(res.status).toBe(400);
  });

  it("PATCH /reports/:reportId requires auth", async () => {
    const res = await request(app)
      .patch(`/api/v1/projects/${PROJECT_ID}/reports/00000000-0000-0000-0000-000000000001`)
      .send({ workDescription: "Updated" });

    expect(res.status).toBe(401);
  });

  it("PATCH /reports/:reportId/status validates status enum", async () => {
    const res = await request(app)
      .patch(`/api/v1/projects/${PROJECT_ID}/reports/00000000-0000-0000-0000-000000000001/status`)
      .set("Cookie", buildAuthCookie("ADMIN"))
      .send({ status: "INVALID" });

    expect(res.status).toBe(400);
  });

  it("DELETE /reports/:reportId requires DAILY_REPORT ADMIN permission", async () => {
    const res = await request(app)
      .delete(`/api/v1/projects/${PROJECT_ID}/reports/00000000-0000-0000-0000-000000000001`)
      .set("Cookie", buildAuthCookie("ENGINEER"));

    expect(res.status).toBe(403);
  });
});
