import api from "../../../config/api";
import type { DashboardStats } from "@construction/shared";

interface DashboardResponse {
  success: true;
  data: DashboardStats;
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const res = await api.get<DashboardResponse>("/dashboard/stats");
  return res.data.data;
}
