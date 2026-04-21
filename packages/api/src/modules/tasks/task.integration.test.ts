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

vi.mock("./task.service", () => ({
  taskService: {
    list: vi.fn().mockResolvedValue({ tasks: [], total: 0 }),
    getById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateStatus: vi.fn(),
    delete: vi.fn().mockResolvedValue(undefined),
    submitForApproval: vi.fn(),
  },
}));

vi.mock("./task-comment.service", () => ({
  taskCommentService: {
    list: vi.fn().mockResolvedValue([]),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn().mockResolvedValue(undefined),
  },
}));

const { default: app } = await import("../../app");

const PROJECT_ID = "11111111-1111-1111-1111-111111111111";

describe("Tasks - request contract", () => {
  it("GET /projects/:projectId/tasks requires authentication", async () => {
    const res = await request(app).get(`/api/v1/projects/${PROJECT_ID}/tasks`);
    expect(res.status).toBe(401);
  });

  it("GET /projects/:projectId/tasks returns task list", async () => {
    const res = await request(app)
      .get(`/api/v1/projects/${PROJECT_ID}/tasks`)
      .set("Cookie", buildAuthCookie("VIEWER"));

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.meta).toBeDefined();
  });

  it("GET /projects/:projectId/tasks accepts status filter", async () => {
    const res = await request(app)
      .get(`/api/v1/projects/${PROJECT_ID}/tasks?status=IN_PROGRESS`)
      .set("Cookie", buildAuthCookie("ENGINEER"));

    expect(res.status).toBe(200);
  });

  it("VIEWER cannot create tasks", async () => {
    const res = await request(app)
      .post(`/api/v1/projects/${PROJECT_ID}/tasks`)
      .set("Cookie", buildAuthCookie("VIEWER"))
      .send({
        title: "New Task",
        description: "Description",
        priority: "HIGH",
      });

    expect(res.status).toBe(403);
  });

  it("POST /projects/:projectId/tasks validates required fields", async () => {
    const res = await request(app)
      .post(`/api/v1/projects/${PROJECT_ID}/tasks`)
      .set("Cookie", buildAuthCookie("ENGINEER"))
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("POST /projects/:projectId/tasks validates priority enum", async () => {
    const res = await request(app)
      .post(`/api/v1/projects/${PROJECT_ID}/tasks`)
      .set("Cookie", buildAuthCookie("ENGINEER"))
      .send({
        title: "Task",
        priority: "INVALID_PRIORITY",
        assignedTo: "00000000-0000-0000-0000-000000000000",
      });

    expect(res.status).toBe(400);
  });

  it("PATCH /projects/:projectId/tasks/:taskId validates status enum", async () => {
    const res = await request(app)
      .patch(`/api/v1/projects/${PROJECT_ID}/tasks/00000000-0000-0000-0000-000000000001/status`)
      .set("Cookie", buildAuthCookie("ENGINEER"))
      .send({ status: "INVALID_STATUS" });

    expect(res.status).toBe(400);
  });

  it("VIEWER cannot update tasks", async () => {
    const res = await request(app)
      .patch(`/api/v1/projects/${PROJECT_ID}/tasks/00000000-0000-0000-0000-000000000001`)
      .set("Cookie", buildAuthCookie("VIEWER"))
      .send({ title: "Updated Task" });

    expect(res.status).toBe(403);
  });

  it("DELETE /projects/:projectId/tasks/:taskId requires TASK ADMIN permission", async () => {
    const res = await request(app)
      .delete(`/api/v1/projects/${PROJECT_ID}/tasks/00000000-0000-0000-0000-000000000001`)
      .set("Cookie", buildAuthCookie("ENGINEER"));

    expect(res.status).toBe(403);
  });

  it("GET /projects/:projectId/tasks/:taskId/comments requires auth", async () => {
    const res = await request(app).get(`/api/v1/projects/${PROJECT_ID}/tasks/00000000-0000-0000-0000-000000000001/comments`);

    expect(res.status).toBe(401);
  });

  it("VIEWER cannot create comments", async () => {
    const res = await request(app)
      .post(`/api/v1/projects/${PROJECT_ID}/tasks/00000000-0000-0000-0000-000000000001/comments`)
      .set("Cookie", buildAuthCookie("VIEWER"))
      .send({ content: "A comment" });

    expect(res.status).toBe(403);
  });

  it("POST /projects/:projectId/tasks/:taskId/comments validates content", async () => {
    const res = await request(app)
      .post(`/api/v1/projects/${PROJECT_ID}/tasks/00000000-0000-0000-0000-000000000001/comments`)
      .set("Cookie", buildAuthCookie("ADMIN"))
      .send({ content: "" });

    expect(res.status).toBe(400);
  });
});
