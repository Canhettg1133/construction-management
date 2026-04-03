import { prisma } from "../../config/database";

export const userRepository = {
  findAll(page: number, pageSize: number, role?: string, q?: string) {
    const where: Record<string, unknown> = { deletedAt: null };
    if (role) where.role = role;
    if (q) {
      where.OR = [
        { name: { contains: q } },
        { email: { contains: q } },
      ];
    }
    return prisma.user.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true, email: true, role: true, phone: true, isActive: true, lastLoginAt: true, createdAt: true },
    });
  },

  countAll(role?: string, q?: string) {
    const where: Record<string, unknown> = { deletedAt: null };
    if (role) where.role = role;
    if (q) {
      where.OR = [
        { name: { contains: q } },
        { email: { contains: q } },
      ];
    }
    return prisma.user.count({ where });
  },

  findById(id: string) {
    return prisma.user.findUnique({
      where: { id, deletedAt: null },
      select: { id: true, name: true, email: true, role: true, phone: true, avatarUrl: true, isActive: true, lastLoginAt: true, createdAt: true, updatedAt: true },
    });
  },

  findByEmail(email: string) {
    return prisma.user.findUnique({ where: { email, deletedAt: null } });
  },

  create(data: { name: string; email: string; passwordHash: string; role: string; phone?: string }) {
    return prisma.user.create({ data: data as any });
  },

  update(id: string, data: { name?: string; role?: string; phone?: string }) {
    return prisma.user.update({ where: { id }, data: data as any });
  },

  updateMe(id: string, data: { name?: string; phone?: string }) {
    return prisma.user.update({
      where: { id },
      data: { name: data.name, phone: data.phone },
      select: { id: true, name: true, email: true, role: true, phone: true, avatarUrl: true, isActive: true, lastLoginAt: true, createdAt: true, updatedAt: true },
    });
  },

  toggleStatus(id: string, isActive: boolean) {
    return prisma.user.update({
      where: { id },
      data: { isActive, deletedAt: isActive ? null : new Date() },
    });
  },
};
