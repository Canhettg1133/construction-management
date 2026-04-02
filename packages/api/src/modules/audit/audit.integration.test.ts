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

describe("Audit Logs — A6 Audit Log (UAT)", () => {
  it("AC-7.2 GET /audit-logs requires authentication", async () => {
    const res = await request(app).get("/api/v1/audit-logs");
    expect(res.status).toBe(401);
  });

  it("AC-7.2 GET /audit-logs rejects VIEWER", async () => {
    const token = signToken("VIEWER");
    const res = await request(app)
      .get("/api/v1/audit-logs")
      .set("Cookie", [`access_token=${token}`]);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN");
  });

  it("AC-7.2 GET /audit-logs rejects PROJECT_MANAGER", async () => {
    const token = signToken("PROJECT_MANAGER");
    const res = await request(app)
      .get("/api/v1/audit-logs")
      .set("Cookie", [`access_token=${token}`]);

    expect(res.status).toBe(403);
  });

  it("GET /audit-logs allows ADMIN", async () => {
    const token = signToken("ADMIN");
    const res = await request(app)
      .get("/api/v1/audit-logs")
      .set("Cookie", [`access_token=${token}`]);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.meta).toBeDefined();
  });

  it("GET /audit-logs accepts action filter", async () => {
    const token = signToken("ADMIN");
    const res = await request(app)
      .get("/api/v1/audit-logs?action=CREATE")
      .set("Cookie", [`access_token=${token}`]);

    expect(res.status).toBe(200);
  });

  it("GET /audit-logs accepts entity_type filter", async () => {
    const token = signToken("ADMIN");
    const res = await request(app)
      .get("/api/v1/audit-logs?entity_type=TASK")
      .set("Cookie", [`access_token=${token}`]);

    expect(res.status).toBe(200);
  });

  it("GET /audit-logs accepts user_id filter", async () => {
    const token = signToken("ADMIN");
    const res = await request(app)
      .get("/api/v1/audit-logs?user_id=00000000-0000-0000-0000-000000000001")
      .set("Cookie", [`access_token=${token}`]);

    expect(res.status).toBe(200);
  });
});
