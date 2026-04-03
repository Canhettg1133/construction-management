import { prisma } from "../../config/database";

export const memberRepository = {
  findByProject(projectId: string) {
    return prisma.projectMember.findMany({
      where: { projectId },
      include: { user: { select: { id: true, name: true, email: true, systemRole: true } } },
      orderBy: { joinedAt: "asc" },
    });
  },

  findById(id: string) {
    return prisma.projectMember.findUnique({ where: { id } });
  },

  findByProjectAndUser(projectId: string, userId: string) {
    return prisma.projectMember.findUnique({ where: { projectId_userId: { projectId, userId } } });
  },

  create(projectId: string, userId: string, role: string) {
    return prisma.projectMember.create({
      data: { projectId, userId, role } as any,
    });
  },

  updateRole(id: string, role: string) {
    return prisma.projectMember.update({ where: { id }, data: { role } as any });
  },

  delete(id: string) {
    return prisma.projectMember.delete({ where: { id } });
  },

  isMember(projectId: string, userId: string) {
    return prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId } },
    });
  },
};
