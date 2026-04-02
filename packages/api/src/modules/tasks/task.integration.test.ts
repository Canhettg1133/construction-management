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

describe("Tasks — A4 Tasks (UAT)", () => {
  it("GET /projects/:projectId/tasks requires authentication", async () => {
    const res = await request(app).get(`/api/v1/projects/${PROJECT_ID}/tasks`);
    expect(res.status).toBe(401);
  });

  it("GET /projects/:projectId/tasks returns task list", async () => {
    const token = signToken("VIEWER");
    const res = await request(app)
      .get(`/api/v1/projects/${PROJECT_ID}/tasks`)
      .set("Cookie", [`access_token=${token}`]);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.meta).toBeDefined();
  });

  it("GET /projects/:projectId/tasks accepts status filter", async () => {
    const token = signToken("SITE_ENGINEER");
    const res = await request(app)
      .get(`/api/v1/projects/${PROJECT_ID}/tasks?status=IN_PROGRESS`)
      .set("Cookie", [`access_token=${token}`]);

    expect(res.status).toBe(200);
  });

  it("POST /projects/:projectId/tasks requires proper role", async () => {
    const token = signToken("VIEWER");
    const res = await request(app)
      .post(`/api/v1/projects/${PROJECT_ID}/tasks`)
      .set("Cookie", [`access_token=${token}`])
      .send({
        title: "New Task",
        description: "Description",
        priority: "HIGH",
      });

    expect(res.status).toBe(403);
  });

  it("POST /projects/:projectId/tasks validates required fields", async () => {
    const token = signToken("SITE_ENGINEER");
    const res = await request(app)
      .post(`/api/v1/projects/${PROJECT_ID}/tasks`)
      .set("Cookie", [`access_token=${token}`])
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("POST /projects/:projectId/tasks validates priority enum", async () => {
    const token = signToken("SITE_ENGINEER");
    const res = await request(app)
      .post(`/api/v1/projects/${PROJECT_ID}/tasks`)
      .set("Cookie", [`access_token=${token}`])
      .send({
        title: "Task",
        priority: "INVALID_PRIORITY",
        assignedTo: "00000000-0000-0000-0000-000000000000",
      });

    expect(res.status).toBe(400);
  });

  it("PATCH /projects/:projectId/tasks/:taskId validates status enum", async () => {
    const token = signToken("SITE_ENGINEER");
    const res = await request(app)
      .patch(`/api/v1/projects/${PROJECT_ID}/tasks/00000000-0000-0000-0000-000000000001/status`)
      .set("Cookie", [`access_token=${token}`])
      .send({ status: "INVALID_STATUS" });

    expect(res.status).toBe(400);
  });

  it("PATCH /projects/:projectId/tasks/:taskId requires proper role", async () => {
    const token = signToken("VIEWER");
    const res = await request(app)
      .patch(`/api/v1/projects/${PROJECT_ID}/tasks/00000000-0000-0000-0000-000000000001`)
      .set("Cookie", [`access_token=${token}`])
      .send({ title: "Updated Task" });

    expect(res.status).toBe(403);
  });

  it("DELETE /projects/:projectId/tasks/:taskId requires ADMIN or PM", async () => {
    const token = signToken("SITE_ENGINEER");
    const res = await request(app)
      .delete(`/api/v1/projects/${PROJECT_ID}/tasks/00000000-0000-0000-0000-000000000001`)
      .set("Cookie", [`access_token=${token}`]);

    expect(res.status).toBe(403);
  });

  // Task Comments
  it("GET /projects/:projectId/tasks/:taskId/comments requires auth", async () => {
    const res = await request(app)
      .get(`/api/v1/projects/${PROJECT_ID}/tasks/00000000-0000-0000-0000-000000000001/comments`);

    expect(res.status).toBe(401);
  });

  it("POST /projects/:projectId/tasks/:taskId/comments requires auth", async () => {
    const token = signToken("VIEWER");
    const res = await request(app)
      .post(`/api/v1/projects/${PROJECT_ID}/tasks/00000000-0000-0000-0000-000000000001/comments`)
      .set("Cookie", [`access_token=${token}`])
      .send({ content: "A comment" });

    expect(res.status).toBe(403);
  });

  it("POST /projects/:projectId/tasks/:taskId/comments validates content", async () => {
    const token = signToken("ADMIN");
    const res = await request(app)
      .post(`/api/v1/projects/${PROJECT_ID}/tasks/00000000-0000-0000-0000-000000000001/comments`)
      .set("Cookie", [`access_token=${token}`])
      .send({ content: "" });

    expect(res.status).toBe(400);
  });
});
