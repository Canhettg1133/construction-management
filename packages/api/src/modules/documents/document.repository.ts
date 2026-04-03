import { prisma } from '../../config/database'

const fileInclude = {
  uploader: { select: { id: true, name: true, email: true } },
  folder: { select: { id: true, name: true, parentId: true, projectId: true } },
  project: { select: { id: true, name: true, code: true } },
}

export const documentRepository = {
  findProjectById(projectId: string) {
    return prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true },
    })
  },

  findFolderById(id: string) {
    return prisma.documentFolder.findUnique({
      where: { id },
      include: {
        creator: { select: { id: true, name: true, email: true } },
      },
    })
  },

  findFolderByName(projectId: string, name: string, parentId?: string | null) {
    return prisma.documentFolder.findFirst({
      where: {
        projectId,
        name,
        parentId: parentId ?? null,
      },
    })
  },

  findRootFolders(projectId: string) {
    return prisma.documentFolder.findMany({
      where: { projectId, parentId: null },
      orderBy: { name: 'asc' },
    })
  },

  findChildFolders(projectId: string, parentId: string) {
    return prisma.documentFolder.findMany({
      where: { projectId, parentId },
      orderBy: { name: 'asc' },
    })
  },

  createFolder(data: { projectId: string; name: string; parentId?: string | null; createdBy: string }) {
    return prisma.documentFolder.create({
      data: {
        projectId: data.projectId,
        name: data.name,
        parentId: data.parentId ?? null,
        createdBy: data.createdBy,
      },
    })
  },

  findLatestFilesByFolder(projectId: string, folderId?: string | null) {
    return prisma.projectFile.findMany({
      where: {
        projectId,
        folderId: folderId ?? null,
        nextVersions: { none: {} },
        deletedAt: null,
      },
      orderBy: { createdAt: 'desc' },
      include: {
        ...fileInclude,
      },
    })
  },

  searchLatestFiles(params: { q?: string; projectId?: string; tags?: string[] }) {
    const where: Record<string, unknown> = {
      nextVersions: { none: {} },
      deletedAt: null,
    }

    if (params.projectId) {
      where.projectId = params.projectId
    }

    if (params.q) {
      where.OR = [{ originalName: { contains: params.q } }, { fileName: { contains: params.q } }]
    }

    if (params.tags && params.tags.length > 0) {
      const tagConditions = params.tags.map((tag) => ({ tags: { contains: tag } }))
      const currentAnd = Array.isArray((where as { AND?: unknown[] }).AND) ? (where as { AND: unknown[] }).AND : []
      where.AND = [...currentAnd, { OR: tagConditions }]
    }

    return prisma.projectFile.findMany({
      where: where as any,
      orderBy: { createdAt: 'desc' },
      include: {
        ...fileInclude,
      },
    })
  },

  findFileById(id: string) {
    return prisma.projectFile.findFirst({
      where: { id, deletedAt: null },
      include: {
        ...fileInclude,
      },
    })
  },

  findFileByIdAnyState(id: string) {
    return prisma.projectFile.findUnique({
      where: { id },
      include: {
        ...fileInclude,
      },
    })
  },

  findNextVersions(parentVersionId: string) {
    return prisma.projectFile.findMany({
      where: { parentVersionId, deletedAt: null },
      orderBy: [{ version: 'asc' }, { createdAt: 'asc' }],
      include: {
        ...fileInclude,
      },
    })
  },

  findNextVersionsAnyState(parentVersionId: string) {
    return prisma.projectFile.findMany({
      where: { parentVersionId },
      orderBy: [{ version: 'asc' }, { createdAt: 'asc' }],
      include: {
        ...fileInclude,
      },
    })
  },

  findLatestTrashedFiles(projectId?: string) {
    return prisma.projectFile.findMany({
      where: {
        ...(projectId ? { projectId } : {}),
        nextVersions: { none: {} },
        deletedAt: { not: null },
      },
      orderBy: [{ deletedAt: 'desc' }, { createdAt: 'desc' }],
      include: {
        ...fileInclude,
      },
    })
  },

  softDeleteFiles(ids: string[], deletedAt: Date) {
    return prisma.projectFile.updateMany({
      where: {
        id: { in: ids },
        deletedAt: null,
      },
      data: {
        deletedAt,
      },
    })
  },

  restoreFiles(ids: string[]) {
    return prisma.projectFile.updateMany({
      where: {
        id: { in: ids },
      },
      data: {
        deletedAt: null,
      },
    })
  },

  deleteFilesPermanently(ids: string[]) {
    return prisma.$transaction(
      [...ids].reverse().map((id) =>
        prisma.projectFile.delete({
          where: { id },
        }),
      ),
    )
  },

  async purgeTrashedFilesBefore(cutoff: Date) {
    const result = await prisma.projectFile.deleteMany({
      where: {
        deletedAt: {
          not: null,
          lte: cutoff,
        },
      },
    })
    return result.count
  },

  createFileVersion(data: {
    projectId: string
    uploadedBy: string
    folderId?: string | null
    fileName: string
    originalName: string
    fileSize: number
    mimeType: string
    filePath: string
    fileType: string
    version: number
    parentVersionId: string
    tags?: string | null
  }) {
    return prisma.projectFile.create({
      data: {
        projectId: data.projectId,
        uploadedBy: data.uploadedBy,
        folderId: data.folderId ?? null,
        fileName: data.fileName,
        originalName: data.originalName,
        fileSize: data.fileSize,
        mimeType: data.mimeType,
        filePath: data.filePath,
        fileType: data.fileType,
        version: data.version,
        parentVersionId: data.parentVersionId,
        tags: data.tags ?? null,
      },
      include: {
        ...fileInclude,
      },
    })
  },
}
