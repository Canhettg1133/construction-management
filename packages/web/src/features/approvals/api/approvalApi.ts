import api from "../../../config/api";
import type { Task, DailyReport } from "@construction/shared";

interface ApiSingleResponse<T> {
  success: true;
  data: T;
}

interface ApprovalListResponse {
  success: true;
  data: {
    reports: (DailyReport & { project: { id: string; name: string } })[];
    tasks: (Task & { project: { id: string; name: string } })[];
  };
  meta: { page: number; pageSize: number; total: number; totalPages: number };
}

export async function listPendingApprovals(params?: { page?: number; pageSize?: number }) {
  const res = await api.get<ApprovalListResponse>("/approvals", { params });
  return res.data;
}

export async function approveReport(reportId: string) {
  const res = await api.post<ApiSingleResponse<DailyReport>>(`/approvals/reports/${reportId}/approve`);
  return res.data.data;
}

export async function rejectReport(reportId: string, reason: string) {
  const res = await api.post<ApiSingleResponse<DailyReport>>(`/approvals/reports/${reportId}/reject`, { reason });
  return res.data.data;
}

export async function approveTask(taskId: string) {
  const res = await api.post<ApiSingleResponse<Task>>(`/approvals/tasks/${taskId}/approve`);
  return res.data.data;
}

export async function rejectTask(taskId: string, reason: string) {
  const res = await api.post<ApiSingleResponse<Task>>(`/approvals/tasks/${taskId}/reject`, { reason });
  return res.data.data;
}
