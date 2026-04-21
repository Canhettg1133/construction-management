import { describe, expect, it, vi } from "vitest";
import request from "supertest";
import { buildAuthCookie } from "../../test/request-test-helpers";

process.env.DATABASE_URL = process.env.DATABASE_URL ?? "mysql://test:test@localhost:3306/test";
process.env.JWT_SECRET = process.env.JWT_SECRET ?? "test-jwt-secret-test-jwt-secret-123";
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET ?? "test-refresh-secret-test-refresh-secret-123";
process.env.NODE_ENV = "test";

vi.mock("./project.service", () => ({
  projectService: {
    list: vi.fn().mockResolvedValue({ projects: [], total: 0 }),
    getById: vi.fn().mockResolvedValue({ id: "p-1" }),
    create: vi.fn(),
    update: vi.fn(),
  },
}));

const { default: app } = await import("../../app");

const PROJECT_ID = "11111111-1111-1111-1111-111111111111";

describe("Projects - request contract", () => {
  it("GET /projects requires authentication", async () => {
    const res = await request(app).get("/api/v1/projects");
    expect(res.status).toBe(401);
  });

  it("GET /projects returns project list for authenticated user", async () => {
    const res = await request(app).get("/api/v1/projects").set("Cookie", buildAuthCookie("STAFF"));

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.meta).toBeDefined();
  });

  it("GET /projects/:id requires authentication", async () => {
    const res = await request(app).get(`/api/v1/projects/${PROJECT_ID}`);

    expect(res.status).toBe(401);
  });

  it("POST /projects requires ADMIN role", async () => {
    const res = await request(app)
      .post("/api/v1/projects")
      .set("Cookie", buildAuthCookie("STAFF"))
      .send({
        code: "TEST-01",
        name: "Test Project",
        location: "Hanoi",
        startDate: "2025-01-01",
      });

    expect(res.status).toBe(403);
  });

  it("POST /projects validates required fields", async () => {
    const res = await request(app).post("/api/v1/projects").set("Cookie", buildAuthCookie("ADMIN")).send({});

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
    expect(res.body.error.details).toBeDefined();
  });

  it("POST /projects validates code format", async () => {
    const res = await request(app)
      .post("/api/v1/projects")
      .set("Cookie", buildAuthCookie("ADMIN"))
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
    const res = await request(app)
      .post("/api/v1/projects")
      .set("Cookie", buildAuthCookie("ADMIN"))
      .send({
        code: "TEST-END",
        name: "Test",
        location: "Hanoi",
        startDate: "2025-06-01",
        endDate: "2025-01-01",
      });

    expect(res.status).toBe(400);
  });

  it("PATCH /projects/:id requires ADMIN", async () => {
    const res = await request(app)
      .patch(`/api/v1/projects/${PROJECT_ID}`)
      .set("Cookie", buildAuthCookie("STAFF"))
      .send({ name: "Updated Name" });

    expect(res.status).toBe(403);
  });
});
