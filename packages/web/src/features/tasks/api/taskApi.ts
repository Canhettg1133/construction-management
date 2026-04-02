import api from "../../../config/api";
import type { Task, TaskComment } from "@construction/shared";

interface ApiListResponse<T> {
  success: true;
  data: T[];
  meta?: { page: number; pageSize: number; total: number; totalPages: number };
}

interface ApiSingleResponse<T> {
  success: true;
  data: T;
}

interface TaskListParams {
  page?: number;
  pageSize?: number;
  status?: string;
  priority?: string;
  assigned_to?: string;
  from?: string;
  to?: string;
}

export async function listTasks(projectId: string, params?: TaskListParams) {
  const res = await api.get<ApiListResponse<Task>>(`/projects/${projectId}/tasks`, { params });
  return { tasks: res.data.data, meta: res.data.meta };
}

export async function getTask(projectId: string, taskId: string) {
  const res = await api.get<ApiSingleResponse<Task>>(`/projects/${projectId}/tasks/${taskId}`);
  return res.data.data;
}

export async function createTask(projectId: string, payload: {
  title: string;
  description?: string;
  assignedTo?: string;
  priority: "LOW" | "MEDIUM" | "HIGH";
  dueDate?: string;
}) {
  const res = await api.post<ApiSingleResponse<Task>>(`/projects/${projectId}/tasks`, payload);
  return res.data.data;
}

export async function updateTask(projectId: string, taskId: string, payload: {
  title?: string;
  description?: string;
  assignedTo?: string;
  priority?: "LOW" | "MEDIUM" | "HIGH";
  dueDate?: string;
}) {
  const res = await api.patch<ApiSingleResponse<Task>>(`/projects/${projectId}/tasks/${taskId}`, payload);
  return res.data.data;
}

export async function updateTaskStatus(projectId: string, taskId: string, status: Task["status"]) {
  const res = await api.patch<ApiSingleResponse<Task>>(`/projects/${projectId}/tasks/${taskId}/status`, { status });
  return res.data.data;
}

export async function deleteTask(projectId: string, taskId: string) {
  await api.delete(`/projects/${projectId}/tasks/${taskId}`);
}

export async function listTaskComments(projectId: string, taskId: string) {
  const res = await api.get<ApiListResponse<TaskComment>>(`/projects/${projectId}/tasks/${taskId}/comments`);
  return res.data.data;
}

export async function createTaskComment(projectId: string, taskId: string, content: string) {
  const res = await api.post<ApiSingleResponse<TaskComment>>(`/projects/${projectId}/tasks/${taskId}/comments`, { content });
  return res.data.data;
}

export async function deleteTaskComment(projectId: string, taskId: string, commentId: string) {
  await api.delete(`/projects/${projectId}/tasks/${taskId}/comments/${commentId}`);
}
