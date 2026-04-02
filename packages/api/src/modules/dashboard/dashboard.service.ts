import type { TaskStatus } from "@construction/shared";
import { dashboardRepository } from "./dashboard.repository";

const TASK_STATUSES: TaskStatus[] = ["TO_DO", "IN_PROGRESS", "DONE", "CANCELLED"];

export const dashboardService = {
  async getStats() {
    const now = new Date();
    const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

    const [
      projectCount,
      activeProjectCount,
      openTaskCount,
      overdueTaskCount,
      todayReportCount,
      memberCount,
      rawTasksByStatus,
      recentActivity,
    ] = await Promise.all([
      dashboardRepository.countProjects(),
      dashboardRepository.countActiveProjects(),
      dashboardRepository.countOpenTasks(),
      dashboardRepository.countOverdueTasks(),
      dashboardRepository.countTodayReports(today),
      dashboardRepository.countActiveMembers(),
      dashboardRepository.countTasksByStatus(),
      dashboardRepository.findRecentActivity(10),
    ]);

    const tasksByStatus = TASK_STATUSES.reduce<Record<TaskStatus, number>>((acc, status) => {
      const row = rawTasksByStatus.find((item) => item.status === status);
      acc[status] = row?._count.status ?? 0;
      return acc;
    }, {
      TO_DO: 0,
      IN_PROGRESS: 0,
      DONE: 0,
      CANCELLED: 0,
    });

    return {
      projectCount,
      activeProjectCount,
      openTaskCount,
      overdueTaskCount,
      todayReportCount,
      memberCount,
      tasksByStatus,
      recentActivity,
      updatedAt: new Date().toISOString(),
    };
  },
};
