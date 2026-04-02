import { prisma } from "../../config/database";

export const projectRepository = {
  findAll(page: number, pageSize: number, userId?: string, status?: string, q?: string) {
    const where: any = {};
    if (status) where.status = status;
    if (q) {
      where.OR = [
        { name: { contains: q } },
        { code: { contains: q, mode: 'insensitive' } },
        { location: { contains: q } },
      ];
    }
    if (userId) {
      where.members = {
        some: { userId }
      };
    }
    return prisma.project.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: { members: true, dailyReports: true, tasks: true }
        }
      }
    });
  },

  countAll(userId?: string, status?: string, q?: string) {
    const where: any = {};
    if (status) where.status = status;
    if (q) {
      where.OR = [
        { name: { contains: q } },
        { code: { contains: q, mode: 'insensitive' } },
        { location: { contains: q } },
      ];
    }
    if (userId) {
      where.members = {
        some: { userId }
      };
    }
    return prisma.project.count({ where });
  },

  findById(id: string) {
    return prisma.project.findUnique({ where: { id } });
  },

  findByCode(code: string) {
    return prisma.project.findUnique({ where: { code } });
  },

  create(data: {
    code: string;
    name: string;
    location: string;
    startDate: Date | string;
    createdBy: string;
    description?: string;
    clientName?: string;
    endDate?: Date | string | null;
    status?: string;
  }) {
    return prisma.project.create({
      data: {
        code: data.code,
        name: data.name,
        location: data.location,
        description: data.description,
        clientName: data.clientName,
        startDate: typeof data.startDate === "string" ? new Date(data.startDate) : data.startDate,
        endDate: data.endDate ? (typeof data.endDate === "string" ? new Date(data.endDate) : data.endDate) : null,
        status: (data.status as any) || "ACTIVE",
        createdBy: data.createdBy,
      },
    });
  },

  update(id: string, data: Record<string, unknown>) {
    return prisma.project.update({ where: { id }, data });
  },
};
