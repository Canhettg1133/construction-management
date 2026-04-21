import { describe, expect, it, vi } from "vitest";
import request from "supertest";
import { buildAuthCookie } from "../../test/request-test-helpers";

process.env.DATABASE_URL = process.env.DATABASE_URL ?? "mysql://test:test@localhost:3306/test";
process.env.JWT_SECRET = process.env.JWT_SECRET ?? "test-jwt-secret-test-jwt-secret-123";
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET ?? "test-refresh-secret-test-refresh-secret-123";
process.env.NODE_ENV = "test";

vi.mock("./audit.service", () => ({
  auditService: {
    list: vi.fn().mockResolvedValue({ logs: [], total: 0 }),
  },
}));

const { default: app } = await import("../../app");

describe("Audit Logs - request contract", () => {
  it("GET /audit-logs requires authentication", async () => {
    const res = await request(app).get("/api/v1/audit-logs");
    expect(res.status).toBe(401);
  });

  it("STAFF cannot access audit logs", async () => {
    const res = await request(app).get("/api/v1/audit-logs").set("Cookie", buildAuthCookie("STAFF"));

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN");
  });

  it("ADMIN can access audit logs", async () => {
    const res = await request(app).get("/api/v1/audit-logs").set("Cookie", buildAuthCookie("ADMIN"));

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.meta).toBeDefined();
  });

  it("GET /audit-logs accepts query filters", async () => {
    const res = await request(app)
      .get("/api/v1/audit-logs?action=CREATE&entity_type=TASK&user_id=00000000-0000-0000-0000-000000000001")
      .set("Cookie", buildAuthCookie("ADMIN"));

    expect(res.status).toBe(200);
  });
});
