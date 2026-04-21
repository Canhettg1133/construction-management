import { describe, expect, it, vi } from "vitest";
import request from "supertest";
import { buildAuthCookie } from "../test/request-test-helpers";

process.env.DATABASE_URL = process.env.DATABASE_URL ?? "mysql://test:test@localhost:3306/test";
process.env.JWT_SECRET = process.env.JWT_SECRET ?? "test-jwt-secret-test-jwt-secret-123";
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET ?? "test-refresh-secret-test-refresh-secret-123";

vi.mock("../shared/services/permission.service", async () => {
  const { createPermissionServiceMock } = await import("../test/request-test-helpers");
  return { permissionService: createPermissionServiceMock() };
});

const { default: app } = await import("../app");

describe("Core flow security coverage", () => {
  it("Unauthenticated request to users is rejected", async () => {
    const res = await request(app).get("/api/v1/users");
    expect(res.status).toBe(401);
  });

  it("Non-admin users cannot access admin users page", async () => {
    const res = await request(app).get("/api/v1/users").set("Cookie", buildAuthCookie("STAFF"));
    expect(res.status).toBe(403);
  });

  it("Viewer cannot create daily reports", async () => {
    const res = await request(app)
      .post("/api/v1/projects/11111111-1111-1111-1111-111111111111/reports")
      .set("Cookie", buildAuthCookie("VIEWER"))
      .send({});

    expect(res.status).toBe(403);
  });

  it("Daily report payload is validated before business logic", async () => {
    const res = await request(app)
      .post("/api/v1/projects/11111111-1111-1111-1111-111111111111/reports")
      .set("Cookie", buildAuthCookie("ADMIN"))
      .send({ weather: "SUNNY" });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("Audit log route requires authentication", async () => {
    const res = await request(app).get("/api/v1/audit-logs");
    expect(res.status).toBe(401);
  });

  it("Health endpoint remains reachable", async () => {
    const res = await request(app).get("/api/v1/health");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
