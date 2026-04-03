import { prisma } from "../../config/database";

export const reportRepository = {
  findAll(projectId: string, page: number, pageSize: number, from?: Date, to?: Date, createdBy?: string) {
    const where: Record<string, unknown> = { projectId };
    if (from || to) {
      where.reportDate = {};
      if (from) (where.reportDate as Record<string, unknown>).gte = from;
      if (to) (where.reportDate as Record<string, unknown>).lte = to;
    }
    if (createdBy) where.createdBy = createdBy;

    return prisma.dailyReport.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { reportDate: "desc" },
      include: {
        creator: { select: { id: true, name: true, email: true } },
        images: { orderBy: { displayOrder: "asc" } },
      },
    });
  },

  count(projectId: string, from?: Date, to?: Date, createdBy?: string) {
    const where: Record<string, unknown> = { projectId };
    if (from || to) {
      where.reportDate = {};
      if (from) (where.reportDate as Record<string, unknown>).gte = from;
      if (to) (where.reportDate as Record<string, unknown>).lte = to;
    }
    if (createdBy) where.createdBy = createdBy;
    return prisma.dailyReport.count({ where });
  },

  findById(id: string) {
    return prisma.dailyReport.findUnique({
      where: { id },
      include: {
        creator: { select: { id: true, name: true, email: true } },
        images: { orderBy: { displayOrder: "asc" } },
      },
    });
  },

  findByProjectAndDate(projectId: string, reportDate: Date) {
    return prisma.dailyReport.findFirst({
      where: { projectId, reportDate },
    });
  },

  findLatestBeforeDate(projectId: string, reportDate: Date, excludeId?: string) {
    return prisma.dailyReport.findFirst({
      where: {
        projectId,
        reportDate: { lt: reportDate },
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      orderBy: { reportDate: "desc" },
      select: { id: true, reportDate: true, progress: true },
    });
  },

  findEarliestAfterDate(projectId: string, reportDate: Date, excludeId?: string) {
    return prisma.dailyReport.findFirst({
      where: {
        projectId,
        reportDate: { gt: reportDate },
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      orderBy: { reportDate: "asc" },
      select: { id: true, reportDate: true, progress: true },
    });
  },

  create(data: { projectId: string; createdBy: string; reportDate: Date; weather: string; workerCount: number; workDescription: string; progress: number; temperatureMin?: number; temperatureMax?: number; issues?: string; notes?: string; status?: "DRAFT" | "SENT" }) {
    return prisma.dailyReport.create({ data: data as any });
  },

  update(id: string, data: Record<string, unknown>) {
    return prisma.dailyReport.update({ where: { id }, data });
  },

  delete(id: string) {
    return prisma.dailyReport.delete({ where: { id } });
  },

  canEdit(reportId: string, userId: string, userRole: string) {
    return prisma.dailyReport.findFirst({
      where: {
        id: reportId,
        OR: [
          { createdBy: userId },
          { project: { members: { some: { userId, role: "PROJECT_MANAGER" } } } },
        ],
      },
    });
  },

  getProjectPmIds(projectId: string) {
    return prisma.projectMember.findMany({
      where: { projectId, role: "PROJECT_MANAGER" },
      select: { userId: true },
    }).then((rows) => rows.map((r) => r.userId));
  },
};
