import { prisma } from "../../config/database";

export const fileRepository = {
  findAll(projectId: string, page: number, pageSize: number, fileType?: string) {
    const where: Record<string, unknown> = { projectId };
    if (fileType) where.fileType = fileType;

    return prisma.projectFile.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: "desc" },
      include: { uploader: { select: { id: true, name: true, email: true } } },
    });
  },

  count(projectId: string, fileType?: string) {
    const where: Record<string, unknown> = { projectId };
    if (fileType) where.fileType = fileType;
    return prisma.projectFile.count({ where });
  },

  findById(id: string) {
    return prisma.projectFile.findUnique({ where: { id } });
  },

  create(data: { projectId: string; uploadedBy: string; fileName: string; originalName: string; fileSize: number; mimeType: string; filePath: string; fileType: string }) {
    return prisma.projectFile.create({ data });
  },

  delete(id: string) {
    return prisma.projectFile.delete({ where: { id } });
  },
};
