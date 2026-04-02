import api from "../../../config/api";
import type { ProjectFile } from "@construction/shared";

interface ApiListResponse<T> {
  success: true;
  data: T[];
  meta?: { page: number; pageSize: number; total: number; totalPages: number };
}

interface ApiSingleResponse<T> {
  success: true;
  data: T;
}

interface FileListParams {
  page?: number;
  pageSize?: number;
  file_type?: string;
}

export async function listProjectFiles(projectId: string, params?: FileListParams) {
  const res = await api.get<ApiListResponse<ProjectFile>>(`/projects/${projectId}/files`, { params });
  return { files: res.data.data, meta: res.data.meta };
}

export async function uploadProjectFile(projectId: string, file: File) {
  const formData = new FormData();
  formData.append("file", file);
  const res = await api.post<ApiSingleResponse<ProjectFile>>(`/projects/${projectId}/files`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data.data;
}

export async function deleteProjectFile(projectId: string, fileId: string) {
  await api.delete(`/projects/${projectId}/files/${fileId}`);
}

export function getFileDownloadUrl(projectId: string, fileId: string) {
  return `/api/v1/projects/${projectId}/files/${fileId}/download`;
}
