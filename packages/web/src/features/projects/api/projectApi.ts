import api from "../../../config/api";
import type { Project, ProjectStatus } from "@construction/shared";

interface ApiListResponse<T> {
  success: true;
  data: T[];
  meta?: { page: number; pageSize: number; total: number; totalPages: number };
}

interface ApiSingleResponse<T> {
  success: true;
  data: T;
}

interface ProjectListParams {
  page?: number;
  pageSize?: number;
  status?: ProjectStatus;
  q?: string;
}

export async function listProjects(params?: ProjectListParams) {
  const res = await api.get<ApiListResponse<Project>>("/projects", { params });
  return { projects: res.data.data, meta: res.data.meta };
}

export async function getProject(id: string) {
  const res = await api.get<ApiSingleResponse<Project>>(`/projects/${id}`);
  return res.data.data;
}

export async function createProject(payload: {
  code: string;
  name: string;
  description?: string;
  location: string;
  clientName?: string;
  startDate: string;
  endDate?: string;
  status?: ProjectStatus;
}) {
  const res = await api.post<ApiSingleResponse<Project>>("/projects", payload);
  return res.data.data;
}

export async function updateProject(id: string, payload: {
  name?: string;
  description?: string;
  location?: string;
  clientName?: string;
  startDate?: string;
  endDate?: string;
  status?: ProjectStatus;
  progress?: number;
}) {
  const res = await api.patch<ApiSingleResponse<Project>>(`/projects/${id}`, payload);
  return res.data.data;
}
