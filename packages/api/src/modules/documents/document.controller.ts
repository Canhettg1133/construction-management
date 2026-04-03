import type { Request, Response } from 'express'
import { sendNoContent, sendSuccess } from '../../shared/utils'
import { documentService } from './document.service'

export const documentController = {
  async listProjectDocuments(req: Request, res: Response) {
    const data = await documentService.listProjectDocuments(String(req.params.projectId))
    return sendSuccess(res, data)
  },

  async listFolderContents(req: Request, res: Response) {
    const data = await documentService.listFolderContents(String(req.params.id))
    return sendSuccess(res, data)
  },

  async createFolder(req: Request, res: Response) {
    const folder = await documentService.createFolder({
      projectId: String(req.body.projectId),
      name: String(req.body.name),
      parentId: req.body.parentId ? String(req.body.parentId) : null,
      createdBy: req.user!.id,
    })
    res.status(201)
    return sendSuccess(res, folder)
  },

  async search(req: Request, res: Response) {
    const files = await documentService.searchDocuments({
      q: req.query.q ? String(req.query.q) : undefined,
      projectId: req.query.project_id ? String(req.query.project_id) : undefined,
      tags: req.query.tags ? String(req.query.tags) : undefined,
    })
    return sendSuccess(res, files)
  },

  async listTrash(req: Request, res: Response) {
    const files = await documentService.listTrashDocuments({
      projectId: req.query.project_id ? String(req.query.project_id) : undefined,
    })
    return sendSuccess(res, files)
  },

  async listVersions(req: Request, res: Response) {
    const versions = await documentService.listVersions(String(req.params.id))
    return sendSuccess(res, versions)
  },

  async replace(req: Request, res: Response) {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Chưa chọn tệp để thay thế',
        },
      })
    }

    const replaced = await documentService.replaceDocumentVersion(
      String(req.params.id),
      req.user!.id,
      req.file,
      typeof req.body.tags === 'string' ? req.body.tags : undefined,
    )
    res.status(201)
    return sendSuccess(res, replaced)
  },

  async moveToTrash(req: Request, res: Response) {
    const trashed = await documentService.moveDocumentToTrash(String(req.params.id), req.user!.id)
    return sendSuccess(res, trashed)
  },

  async restore(req: Request, res: Response) {
    const restored = await documentService.restoreDocumentFromTrash(String(req.params.id), req.user!.id)
    return sendSuccess(res, restored)
  },

  async permanentlyDelete(req: Request, res: Response) {
    await documentService.permanentlyDeleteDocument(String(req.params.id), req.user!.id)
    return sendNoContent(res)
  },
}
