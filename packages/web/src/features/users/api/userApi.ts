import api from "../../../config/api";
import type { User, SystemRole } from "@construction/shared";

interface ApiListResponse<T> {
  success: true;
  data: T[];
  meta?: { page: number; pageSize: number; total: number; totalPages: number };
}

interface ApiSingleResponse<T> {
  success: true;
  data: T;
}

interface UserListParams {
  page?: number;
  pageSize?: number;
  systemRole?: SystemRole;
  q?: string;
}

export async function listUsers(params?: UserListParams) {
  const res = await api.get<ApiListResponse<User>>("/users", { params });
  return { users: res.data.data, meta: res.data.meta };
}

export async function getUser(id: string) {
  const res = await api.get<ApiSingleResponse<User>>(`/users/${id}`);
  return res.data.data;
}

export async function createUser(payload: {
  name: string;
  email: string;
  password: string;
  systemRole: SystemRole;
  phone?: string;
}) {
  const res = await api.post<ApiSingleResponse<User>>("/users", payload);
  return res.data.data;
}

export async function updateUser(id: string, payload: {
  name?: string;
  systemRole?: SystemRole;
  phone?: string;
}) {
  const res = await api.patch<ApiSingleResponse<User>>(`/users/${id}`, payload);
  return res.data.data;
}

export async function toggleUserStatus(id: string, isActive: boolean) {
  const res = await api.patch<ApiSingleResponse<User>>(`/users/${id}/status`, { isActive });
  return res.data.data;
}
