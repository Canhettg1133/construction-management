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

describe("Files — A5 Files (UAT)", () => {
  it("GET /projects/:projectId/files requires authentication", async () => {
    const res = await request(app).get(`/api/v1/projects/${PROJECT_ID}/files`);
    expect(res.status).toBe(401);
  });

  it("GET /projects/:projectId/files returns list for authenticated user", async () => {
    const token = signToken("VIEWER");
    const res = await request(app)
      .get(`/api/v1/projects/${PROJECT_ID}/files`)
      .set("Cookie", [`access_token=${token}`]);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it("POST /projects/:projectId/files requires proper role", async () => {
    const token = signToken("VIEWER");
    const res = await request(app)
      .post(`/api/v1/projects/${PROJECT_ID}/files`)
      .set("Cookie", [`access_token=${token}`]);

    expect(res.status).toBe(403);
  });

  it("POST /projects/:projectId/files without file body returns 400", async () => {
    const token = signToken("SITE_ENGINEER");
    const res = await request(app)
      .post(`/api/v1/projects/${PROJECT_ID}/files`)
      .set("Cookie", [`access_token=${token}`])
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("DELETE /projects/:projectId/files/:fileId requires ADMIN or PROJECT_MANAGER", async () => {
    const token = signToken("SITE_ENGINEER");
    const res = await request(app)
      .delete(`/api/v1/projects/${PROJECT_ID}/files/00000000-0000-0000-0000-000000000001`)
      .set("Cookie", [`access_token=${token}`]);

    expect(res.status).toBe(403);
  });

  it("PROJECT_MANAGER can delete file", async () => {
    const token = signToken("PROJECT_MANAGER");
    const res = await request(app)
      .delete(`/api/v1/projects/${PROJECT_ID}/files/00000000-0000-0000-0000-000000000001`)
      .set("Cookie", [`access_token=${token}`]);

    // 404 because file doesn't exist, not 403 — PM has permission
    expect(res.status).not.toBe(403);
  });

  it("GET /projects/:projectId/files with file_type filter", async () => {
    const token = signToken("ADMIN");
    const res = await request(app)
      .get(`/api/v1/projects/${PROJECT_ID}/files?file_type=pdf`)
      .set("Cookie", [`access_token=${token}`]);

    expect(res.status).toBe(200);
  });
});
