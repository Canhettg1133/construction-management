import { prisma } from '../../config/database'

export const fileRepository = {
  findAll(projectId: string, page: number, pageSize: number, fileType?: string) {
    const where: Record<string, unknown> = { projectId, deletedAt: null }
    if (fileType) where.fileType = fileType

    return prisma.projectFile.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
      include: { uploader: { select: { id: true, name: true, email: true } } },
    })
  },

  count(projectId: string, fileType?: string) {
    const where: Record<string, unknown> = { projectId, deletedAt: null }
    if (fileType) where.fileType = fileType
    return prisma.projectFile.count({ where })
  },

  findById(id: string) {
    return prisma.projectFile.findFirst({
      where: { id, deletedAt: null },
      include: {
        folder: true,
      },
    })
  },

  findFolderById(id: string) {
    return prisma.documentFolder.findUnique({ where: { id } })
  },

  create(data: {
    projectId: string
    uploadedBy: string
    folderId?: string | null
    fileName: string
    originalName: string
    fileSize: number
    mimeType: string
    filePath: string
    fileType: string
    version?: number
    parentVersionId?: string | null
    tags?: string | null
  }) {
    return prisma.projectFile.create({ data })
  },

  delete(id: string) {
    return prisma.projectFile.delete({ where: { id } })
  },
}
