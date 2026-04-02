import { prisma } from "../../config/database";

export const auditRepository = {
  findAll(page: number, pageSize: number, filters: Record<string, unknown>) {
    const where: Record<string, unknown> = {};
    if (filters.action) where.action = filters.action;
    if (filters.entityType) where.entityType = filters.entityType;
    if (filters.userId) where.userId = filters.userId;
    if (filters.from || filters.to) {
      where.createdAt = {};
      if (filters.from) (where.createdAt as Record<string, unknown>).gte = filters.from;
      if (filters.to) (where.createdAt as Record<string, unknown>).lte = filters.to;
    }

    return prisma.auditLog.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: "desc" },
      include: { user: { select: { id: true, name: true, email: true } } },
    });
  },

  count(filters: Record<string, unknown>) {
    const where: Record<string, unknown> = {};
    if (filters.action) where.action = filters.action;
    if (filters.entityType) where.entityType = filters.entityType;
    if (filters.userId) where.userId = filters.userId;
    if (filters.from || filters.to) {
      where.createdAt = {};
      if (filters.from) (where.createdAt as Record<string, unknown>).gte = filters.from;
      if (filters.to) (where.createdAt as Record<string, unknown>).lte = filters.to;
    }
    return prisma.auditLog.count({ where });
  },

  create(data: { userId?: string; action: string; entityType: string; entityId?: string; description: string; ipAddress?: string; userAgent?: string }) {
    return prisma.auditLog.create({ data: data as any });
  },
};
