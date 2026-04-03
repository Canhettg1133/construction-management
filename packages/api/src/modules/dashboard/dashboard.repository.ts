import { prisma } from "../../config/database";

function daysAgo(days: number): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - days);
  return d;
}

function sevenDaysAgo(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - 6);
  return d;
}

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

  // --- Module 4: Dashboard Nâng cao ---

  async countPendingApprovals() {
    const [taskCount, reportCount] = await Promise.all([
      prisma.task.count({
        where: {
          approvalStatus: "PENDING",
          requiresApproval: true,
          status: { notIn: ["DONE", "CANCELLED"] },
        },
      }),
      prisma.dailyReport.count({
        where: { approvalStatus: "PENDING" },
      }),
    ]);
    return { taskCount, reportCount };
  },

  async findOverdueTasks(limit = 10) {
    const twoDaysAgo = daysAgo(2);
    const tasks = await prisma.task.findMany({
      where: {
        dueDate: { lt: twoDaysAgo },
        status: { notIn: ["DONE", "CANCELLED"] },
      },
      orderBy: { dueDate: "asc" },
      take: limit,
      select: {
        id: true,
        projectId: true,
        title: true,
        dueDate: true,
        priority: true,
        project: { select: { name: true } },
        assignee: { select: { name: true } },
      },
    });
    return tasks.map((t) => ({
      id: t.id,
      projectId: t.projectId,
      title: t.title,
      projectName: t.project.name,
      assigneeName: t.assignee?.name ?? null,
      dueDate: t.dueDate ? new Date(t.dueDate).toISOString() : "",
      priority: t.priority,
      daysOverdue: t.dueDate
        ? Math.floor((Date.now() - new Date(t.dueDate).getTime()) / 86400000)
        : 0,
    }));
  },

  async findRiskyProjects(limit = 5) {
    const projects = await prisma.project.findMany({
      where: { status: "ACTIVE" },
      include: {
        tasks: {
          select: {
            id: true,
            dueDate: true,
            status: true,
          },
        },
      },
    });

    return projects
      .map((p) => {
        const totalTasks = p.tasks.length;
        const overdueTasks = p.tasks.filter(
          (t) =>
            t.dueDate &&
            new Date(t.dueDate) < new Date() &&
            !["DONE", "CANCELLED"].includes(t.status)
        ).length;
        const overdueRate =
          totalTasks > 0 ? Math.round((overdueTasks / totalTasks) * 1000) / 10 : 0;
        return {
          id: p.id,
          name: p.name,
          totalTasks,
          overdueTasks,
          overdueRate,
        };
      })
      .filter((p) => p.overdueTasks > 0)
      .sort((a, b) => b.overdueRate - a.overdueRate || b.overdueTasks - a.overdueTasks)
      .slice(0, limit);
  },

  async findActiveMembers(limit = 5) {
    const sevenDays = sevenDaysAgo();
    const result = await prisma.auditLog.groupBy({
      by: ["userId"],
      where: {
        createdAt: { gte: sevenDays },
        user: { isActive: true },
      },
      _count: { userId: true },
      orderBy: { _count: { userId: "desc" } },
      take: limit,
    });

    const validResults = result.filter((r) => r.userId !== null) as {
      userId: string
      _count: { userId: number }
    }[];

    const userIds = validResults.map((r) => r.userId);
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true, avatarUrl: true },
    });
    const userMap = new Map(users.map((u) => [u.id, u]));

    return validResults
      .map((r) => {
        const user = userMap.get(r.userId);
        if (!user) return null;
        return {
          id: user.id,
          name: user.name,
          avatarUrl: user.avatarUrl,
          actionCount: r._count.userId,
        };
      })
      .filter(Boolean) as {
        id: string
        name: string
        avatarUrl: string | null
        actionCount: number
      }[];
  },

  async findWeeklyProgress() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const days: { date: string; totalTasks: number; completedTasks: number; newTasks: number }[] = [];

    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const next = new Date(d);
      next.setDate(next.getDate() + 1);
      const dateStr = d.toISOString().slice(0, 10);

      const [newTasks, completedTasks] = await Promise.all([
        prisma.task.count({
          where: {
            createdAt: { gte: d, lt: next },
          },
        }),
        prisma.task.count({
          where: {
            completedAt: { gte: d, lt: next },
            status: "DONE",
          },
        }),
      ]);

      days.push({ date: dateStr, totalTasks: newTasks, completedTasks, newTasks });
    }

    return days;
  },
};
