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

vi.mock("./file.service", () => ({
  fileService: {
    list: vi.fn().mockResolvedValue({ files: [], total: 0 }),
    getById: vi.fn(),
    upload: vi.fn(),
    delete: vi.fn().mockResolvedValue(undefined),
  },
}));

const { default: app } = await import("../../app");

const PROJECT_ID = "11111111-1111-1111-1111-111111111111";

describe("Files - request contract", () => {
  it("GET /projects/:projectId/files requires authentication", async () => {
    const res = await request(app).get(`/api/v1/projects/${PROJECT_ID}/files`);
    expect(res.status).toBe(401);
  });

  it("GET /projects/:projectId/files returns list for authenticated user", async () => {
    const res = await request(app)
      .get(`/api/v1/projects/${PROJECT_ID}/files`)
      .set("Cookie", buildAuthCookie("VIEWER"));

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it("VIEWER cannot upload files", async () => {
    const res = await request(app)
      .post(`/api/v1/projects/${PROJECT_ID}/files`)
      .set("Cookie", buildAuthCookie("VIEWER"));

    expect(res.status).toBe(403);
  });

  it("POST /projects/:projectId/files without file body returns 400", async () => {
    const res = await request(app)
      .post(`/api/v1/projects/${PROJECT_ID}/files`)
      .set("Cookie", buildAuthCookie("ENGINEER"))
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("DELETE /projects/:projectId/files/:fileId requires FILE ADMIN permission", async () => {
    const res = await request(app)
      .delete(`/api/v1/projects/${PROJECT_ID}/files/00000000-0000-0000-0000-000000000001`)
      .set("Cookie", buildAuthCookie("ENGINEER"));

    expect(res.status).toBe(403);
  });

  it("PROJECT_MANAGER can delete file", async () => {
    const res = await request(app)
      .delete(`/api/v1/projects/${PROJECT_ID}/files/00000000-0000-0000-0000-000000000001`)
      .set("Cookie", buildAuthCookie("PROJECT_MANAGER"));

    expect(res.status).toBe(204);
  });

  it("GET /projects/:projectId/files accepts file_type filter", async () => {
    const res = await request(app)
      .get(`/api/v1/projects/${PROJECT_ID}/files?file_type=pdf`)
      .set("Cookie", buildAuthCookie("ADMIN"));

    expect(res.status).toBe(200);
  });
});
