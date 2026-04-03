import api from "../../../config/api";
import type { ProjectMember, ProjectRole } from "@construction/shared";

interface ApiListResponse<T> {
  success: true;
  data: T[];
  meta?: { page: number; pageSize: number; total: number; totalPages: number };
}

interface ApiSingleResponse<T> {
  success: true;
  data: T;
}

export async function listProjectMembers(projectId: string) {
  const res = await api.get<ApiListResponse<ProjectMember>>(`/projects/${projectId}/members`);
  return res.data.data;
}

export async function addProjectMember(projectId: string, userId: string, role: ProjectRole) {
  const res = await api.post<ApiSingleResponse<ProjectMember>>(`/projects/${projectId}/members`, { userId, role });
  return res.data.data;
}

export async function updateMemberRole(memberId: string, projectId: string, role: ProjectRole) {
  const res = await api.patch<ApiSingleResponse<ProjectMember>>(`/projects/${projectId}/members/${memberId}`, { role });
  return res.data.data;
}

export async function removeProjectMember(memberId: string, projectId: string) {
  await api.delete(`/projects/${projectId}/members/${memberId}`);
}
