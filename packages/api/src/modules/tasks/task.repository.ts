import { prisma } from "../../config/database";

export const taskRepository = {
  findAll(projectId: string, page: number, pageSize: number, status?: string, priority?: string, assignedTo?: string) {
    const where: Record<string, unknown> = { projectId };
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (assignedTo) where.assignedTo = assignedTo;

    return prisma.task.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: [{ priority: "desc" }, { dueDate: "asc" }],
      include: { assignee: { select: { id: true, name: true, email: true } } },
    });
  },

  count(projectId: string, status?: string, priority?: string, assignedTo?: string) {
    const where: Record<string, unknown> = { projectId };
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (assignedTo) where.assignedTo = assignedTo;
    return prisma.task.count({ where });
  },

  findById(id: string) {
    return prisma.task.findUnique({
      where: { id },
      include: {
        assignee: { select: { id: true, name: true, email: true } },
        creator: { select: { id: true, name: true, email: true } },
        report: { select: { id: true, reportDate: true } },
        comments: {
          orderBy: { createdAt: "asc" },
          include: { author: { select: { id: true, name: true, email: true } } },
        },
      },
    });
  },

  create(data: { projectId: string; title: string; createdBy: string; description?: string; assignedTo?: string; reportId?: string; priority?: string; dueDate?: Date; requiresApproval?: boolean }) {
    return prisma.task.create({ data: data as any });
  },

  getProjectPmIds(projectId: string) {
    return prisma.projectMember.findMany({
      where: { projectId, role: "PROJECT_MANAGER" },
      select: { userId: true },
    }).then((rows) => rows.map((r) => r.userId));
  },

  update(id: string, data: Record<string, unknown>) {
    return prisma.task.update({ where: { id }, data });
  },

  delete(id: string) {
    return prisma.task.delete({ where: { id } });
  },
};
