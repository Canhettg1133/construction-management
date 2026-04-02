import api from "../../../config/api";
import type { User } from "@construction/shared";

export async function login(payload: { email: string; password: string }) {
  const res = await api.post<{ success: true; data: { user: User } }>("/auth/login", payload);
  return res.data.data.user;
}

export async function logout() {
  await api.post("/auth/logout");
}

export async function me() {
  const res = await api.get<{ success: true; data: User }>("/auth/me");
  return res.data.data;
}

export async function forgotPassword(payload: { email: string }) {
  await api.post("/auth/forgot-password", payload);
}

export async function resetPassword(payload: { token: string; newPassword: string }) {
  await api.post("/auth/reset-password", payload);
}

export async function changePassword(payload: { currentPassword: string; newPassword: string }) {
  await api.post("/auth/change-password", payload);
}
