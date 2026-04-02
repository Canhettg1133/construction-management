import { prisma } from "../../config/database";

export const reportImageRepository = {
  findByReport(reportId: string) {
    return prisma.reportImage.findMany({
      where: { reportId },
      orderBy: { displayOrder: "asc" },
    });
  },

  findById(id: string) {
    return prisma.reportImage.findUnique({ where: { id } });
  },

  create(data: {
    reportId: string;
    fileName: string;
    originalName: string;
    fileSize: number;
    mimeType: string;
    filePath: string;
    uploadedBy: string;
  }) {
    return prisma.reportImage.create({ data: data as any });
  },

  delete(id: string) {
    return prisma.reportImage.delete({ where: { id } });
  },
};
