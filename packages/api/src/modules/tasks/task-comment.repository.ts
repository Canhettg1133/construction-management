import { prisma } from "../../config/database";

export const taskCommentRepository = {
  findByTask(taskId: string) {
    return prisma.taskComment.findMany({
      where: { taskId },
      orderBy: { createdAt: "asc" },
      include: { author: { select: { id: true, name: true, email: true, avatarUrl: true } } },
    });
  },

  findById(id: string) {
    return prisma.taskComment.findUnique({ where: { id } });
  },

  create(data: { taskId: string; authorId: string; content: string }) {
    return prisma.taskComment.create({ data: data as any });
  },

  update(id: string, content: string) {
    return prisma.taskComment.update({ where: { id }, data: { content } as any });
  },

  delete(id: string) {
    return prisma.taskComment.delete({ where: { id } });
  },
};
