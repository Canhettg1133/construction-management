import { v4 as uuidv4 } from 'uuid'
import { AuditEntityType } from '@prisma/client'
import { ALLOWED_FILE_TYPES, LIMITS } from '@construction/shared'
import { BadRequestError, ConflictError, NotFoundError } from '../../shared/errors'
import { auditService } from '../audit/audit.service'
import { documentRepository } from './document.repository'
import {
  buildProjectFileRelativePath,
  detectFileType,
  getFileExtension,
  moveUploadedFileToRelativePath,
} from '../files/file.utils'

type DocumentFileRecord = NonNullable<Awaited<ReturnType<typeof documentRepository.findFileByIdAnyState>>>

function normalizeTags(rawTags?: string | null) {
  if (!rawTags) return null
  const parts = rawTags
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
  if (parts.length === 0) return null
  return Array.from(new Set(parts)).join(', ')
}

function parseTagFilters(rawTags?: string) {
  if (!rawTags) return []
  return rawTags
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

function sortVersionChain(a: DocumentFileRecord, b: DocumentFileRecord) {
  const versionDelta = a.version - b.version
  if (versionDelta !== 0) return versionDelta
  return a.createdAt.getTime() - b.createdAt.getTime()
}

async function resolveDocumentChain(fileId: string, options?: { includeDeleted?: boolean }) {
  const includeDeleted = !!options?.includeDeleted
  const current = includeDeleted
    ? await documentRepository.findFileByIdAnyState(fileId)
    : await documentRepository.findFileById(fileId)
  if (!current) return null

  let root: DocumentFileRecord = current as DocumentFileRecord
  const rootVisited = new Set<string>()
  while (root.parentVersionId) {
    if (rootVisited.has(root.id)) break
    rootVisited.add(root.id)
    const parent = includeDeleted
      ? await documentRepository.findFileByIdAnyState(root.parentVersionId)
      : await documentRepository.findFileById(root.parentVersionId)
    if (!parent) break
    root = parent as DocumentFileRecord
  }

  const chain: DocumentFileRecord[] = []
  const queue: DocumentFileRecord[] = [root]
  const visited = new Set<string>()

  while (queue.length > 0) {
    const cursor = queue.shift()!
    if (visited.has(cursor.id)) continue
    visited.add(cursor.id)
    chain.push(cursor)

    const nextVersions = includeDeleted
      ? await documentRepository.findNextVersionsAnyState(cursor.id)
      : await documentRepository.findNextVersions(cursor.id)

    for (const next of nextVersions) {
      if (!visited.has(next.id)) {
        queue.push(next as DocumentFileRecord)
      }
    }
  }

  chain.sort(sortVersionChain)
  return { root, versions: chain }
}

export const documentService = {
  async listProjectDocuments(projectId: string) {
    const project = await documentRepository.findProjectById(projectId)
    if (!project) throw new NotFoundError('Không tìm thấy dự án')

    const [folders, files] = await Promise.all([
      documentRepository.findRootFolders(projectId),
      documentRepository.findLatestFilesByFolder(projectId, null),
    ])

    return { folders, files }
  },

  async listFolderContents(folderId: string) {
    const folder = await documentRepository.findFolderById(folderId)
    if (!folder) throw new NotFoundError('Không tìm thấy thư mục')

    const [folders, files] = await Promise.all([
      documentRepository.findChildFolders(folder.projectId, folder.id),
      documentRepository.findLatestFilesByFolder(folder.projectId, folder.id),
    ])

    return { folder, folders, files }
  },

  async createFolder(data: { projectId: string; name: string; parentId?: string | null; createdBy: string }) {
    const project = await documentRepository.findProjectById(data.projectId)
    if (!project) throw new NotFoundError('Khong tim thay du an')

    const folderName = data.name.trim()
    if (!folderName) {
      throw new BadRequestError('Tên thư mục không hợp lệ')
    }

    if (data.parentId) {
      const parentFolder = await documentRepository.findFolderById(data.parentId)
      if (!parentFolder) throw new NotFoundError('Không tìm thấy thư mục cha')
      if (parentFolder.projectId !== data.projectId) {
        throw new BadRequestError('Thư mục cha không thuộc dự án')
      }
    }

    const duplicated = await documentRepository.findFolderByName(data.projectId, folderName, data.parentId)
    if (duplicated) {
      throw new ConflictError('Thư mục đã tồn tại trong vị trí này')
    }

    const created = await documentRepository.createFolder({
      projectId: data.projectId,
      name: folderName,
      parentId: data.parentId,
      createdBy: data.createdBy,
    })

    await auditService.log({
      userId: data.createdBy,
      action: 'CREATE',
      entityType: AuditEntityType.FILE,
      entityId: created.id,
      description: `Đã tạo thư mục tài liệu: ${created.name}`,
    })

    return created
  },

  async searchDocuments(params: { q?: string; projectId?: string; tags?: string }) {
    if (params.projectId) {
      const project = await documentRepository.findProjectById(params.projectId)
      if (!project) throw new NotFoundError('Khong tim thay du an')
    }

    const tags = parseTagFilters(params.tags)
    return documentRepository.searchLatestFiles({
      q: params.q?.trim() || undefined,
      projectId: params.projectId,
      tags,
    })
  },

  async listTrashDocuments(params: { projectId?: string }) {
    if (params.projectId) {
      const project = await documentRepository.findProjectById(params.projectId)
      if (!project) throw new NotFoundError('Khong tim thay du an')
    }

    return documentRepository.findLatestTrashedFiles(params.projectId)
  },

  async listVersions(fileId: string) {
    const chain = await resolveDocumentChain(fileId, { includeDeleted: false })
    if (!chain) throw new NotFoundError('Không tìm thấy tài liệu')
    return chain.versions
  },

  async replaceDocumentVersion(fileId: string, userId: string, file: Express.Multer.File, rawTags?: string) {
    if (!ALLOWED_FILE_TYPES.includes(file.mimetype)) {
      throw new BadRequestError('Loại tệp không được hỗ trợ')
    }
    if (file.size > LIMITS.MAX_FILE_SIZE) {
      throw new BadRequestError('Tệp vượt quá dung lượng tối đa 10MB')
    }

    const current = await documentRepository.findFileById(fileId)
    if (!current) throw new NotFoundError('Không tìm thấy tài liệu')

    const hasNextVersion = await documentRepository.findNextVersions(fileId)
    if (hasNextVersion.length > 0) {
      throw new BadRequestError('Chỉ có thể thay thế phiên bản mới nhất')
    }

    const extension = getFileExtension(file.mimetype)
    const fileName = `${uuidv4()}${extension}`
    const filePath = buildProjectFileRelativePath(current.projectId, fileName)
    moveUploadedFileToRelativePath(file.path, filePath)

    const created = await documentRepository.createFileVersion({
      projectId: current.projectId,
      uploadedBy: userId,
      folderId: current.folderId,
      fileName,
      originalName: file.originalname,
      fileSize: file.size,
      mimeType: file.mimetype,
      filePath,
      fileType: detectFileType(file.mimetype),
      version: current.version + 1,
      parentVersionId: current.id,
      tags: normalizeTags(rawTags) ?? current.tags ?? null,
    })

    await auditService.log({
      userId,
      action: 'UPDATE',
      entityType: AuditEntityType.FILE,
      entityId: created.id,
      description: `Đã tạo phiên bản ${created.version} cho tài liệu: ${created.originalName}`,
    })

    return created
  },

  async moveDocumentToTrash(fileId: string, userId: string) {
    const file = await documentRepository.findFileByIdAnyState(fileId)
    if (!file) throw new NotFoundError('Không tìm thấy tài liệu')
    if (file.deletedAt) {
      throw new BadRequestError('Tài liệu đã nằm trong thùng rác')
    }

    const chain = await resolveDocumentChain(fileId, { includeDeleted: true })
    if (!chain || chain.versions.length === 0) {
      throw new NotFoundError('Khong tim thay tai lieu')
    }

    const deletedAt = new Date()
    await documentRepository.softDeleteFiles(
      chain.versions.map((version) => version.id),
      deletedAt,
    )

    const latest = chain.versions[chain.versions.length - 1]!
    const updatedLatest = await documentRepository.findFileByIdAnyState(latest.id)

    await auditService.log({
      userId,
      action: 'DELETE',
      entityType: AuditEntityType.FILE,
      entityId: latest.id,
      description: `Đã chuyển tài liệu vào thùng rác: ${latest.originalName}`,
    })

    if (!updatedLatest) {
      throw new NotFoundError('Khong tim thay tai lieu')
    }

    return updatedLatest
  },

  async restoreDocumentFromTrash(fileId: string, userId: string) {
    const file = await documentRepository.findFileByIdAnyState(fileId)
    if (!file) throw new NotFoundError('Không tìm thấy tài liệu')
    if (!file.deletedAt) {
      throw new BadRequestError('Tài liệu không nằm trong thùng rác')
    }

    const chain = await resolveDocumentChain(fileId, { includeDeleted: true })
    if (!chain || chain.versions.length === 0) {
      throw new NotFoundError('Khong tim thay tai lieu')
    }

    await documentRepository.restoreFiles(chain.versions.map((version) => version.id))

    const latest = chain.versions[chain.versions.length - 1]!
    const restoredLatest = await documentRepository.findFileById(latest.id)

    await auditService.log({
      userId,
      action: 'UPDATE',
      entityType: AuditEntityType.FILE,
      entityId: latest.id,
      description: `Đã khôi phục tài liệu từ thùng rác: ${latest.originalName}`,
    })

    if (!restoredLatest) {
      throw new NotFoundError('Khong tim thay tai lieu')
    }

    return restoredLatest
  },

  async permanentlyDeleteDocument(fileId: string, userId: string) {
    const file = await documentRepository.findFileByIdAnyState(fileId)
    if (!file) throw new NotFoundError('Không tìm thấy tài liệu')
    if (!file.deletedAt) {
      throw new BadRequestError('Chỉ được xóa vĩnh viễn tài liệu trong thùng rác')
    }

    const chain = await resolveDocumentChain(fileId, { includeDeleted: true })
    if (!chain || chain.versions.length === 0) {
      throw new NotFoundError('Khong tim thay tai lieu')
    }

    const versionIds = chain.versions.map((version) => version.id)
    const latest = chain.versions[chain.versions.length - 1]!

    await documentRepository.deleteFilesPermanently(versionIds)

    await auditService.log({
      userId,
      action: 'DELETE',
      entityType: AuditEntityType.FILE,
      entityId: latest.id,
      description: `Đã xóa vĩnh viễn tài liệu: ${latest.originalName}`,
    })

    return {
      deletedCount: versionIds.length,
      rootId: chain.root.id,
    }
  },
}
