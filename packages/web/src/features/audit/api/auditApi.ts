import api from "../../../config/api";
import type { AuditLog, AuditAction, AuditEntityType } from "@construction/shared";

interface ApiListResponse<T> {
  success: true;
  data: T[];
  meta?: { page: number; pageSize: number; total: number; totalPages: number };
}

interface AuditLogFilters {
  action?: AuditAction;
  entity_type?: AuditEntityType;
  user_id?: string;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}

export async function listAuditLogs(filters?: AuditLogFilters) {
  const res = await api.get<ApiListResponse<AuditLog>>("/audit-logs", { params: filters });
  return { logs: res.data.data, meta: res.data.meta };
}
