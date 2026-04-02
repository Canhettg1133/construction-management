import { prisma } from "../../config/database";

export const dashboardRepository = {
  countProjects() {
    return prisma.project.count();
  },

  countActiveProjects() {
    return prisma.project.count({ where: { status: "ACTIVE" } });
  },

  countOpenTasks() {
    return prisma.task.count({
      where: { status: { in: ["TO_DO", "IN_PROGRESS"] } },
    });
  },

  countOverdueTasks() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return prisma.task.count({
      where: {
        status: { in: ["TO_DO", "IN_PROGRESS"] },
        dueDate: { lt: today },
      },
    });
  },

  countTodayReports(today: Date) {
    return prisma.dailyReport.count({
      where: {
        reportDate: today,
        status: "SENT",
      },
    });
  },

  countActiveMembers() {
    return prisma.user.count({
      where: { isActive: true },
    });
  },

  countTasksByStatus() {
    return prisma.task.groupBy({
      by: ["status"],
      _count: { status: true },
    });
  },

  findRecentActivity(limit: number) {
    return prisma.auditLog.findMany({
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  },
};
