import { useQuery } from "@tanstack/react-query";
import type { DashboardStats } from "@construction/shared";
import { getDashboardStats } from "../api/dashboardApi";

export function useDashboard() {
  return useQuery<DashboardStats>({
    queryKey: ["dashboard", "stats"],
    queryFn: getDashboardStats,
    refetchInterval: 30000,
    refetchIntervalInBackground: false,
  });
}

