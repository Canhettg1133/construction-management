import { Router } from 'express'
import multer from 'multer'
import fs from 'fs'
import { env } from '../../config/env'
import { ALLOWED_FILE_TYPES, LIMITS } from '@construction/shared'
import {
  authenticate,
  authorize,
  asyncHandler,
  loadUserPermissions,
  requireProjectMembership,
  requireToolPermission,
  validate,
} from '../../shared/middleware'
import { documentController } from './document.controller'
import {
  createDocumentFolderSchema,
  documentFileParamsSchema,
  documentFolderParamsSchema,
  listDocumentTrashSchema,
  projectDocumentsParamsSchema,
  searchDocumentsSchema,
} from './document.validation'

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    fs.mkdirSync(env.UPLOAD_DIR, { recursive: true })
    cb(null, env.UPLOAD_DIR)
  },
  filename: (_req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`)
  },
})

const upload = multer({
  storage,
  limits: { fileSize: LIMITS.MAX_FILE_SIZE },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_FILE_TYPES.includes(file.mimetype)) {
      cb(null, true)
      return
    }
    cb(new Error('Loai file khong duoc ho tro'))
  },
})

export const projectDocumentRoutes: Router = Router({ mergeParams: true })
projectDocumentRoutes.use(authenticate)
projectDocumentRoutes.use(requireProjectMembership())
projectDocumentRoutes.use(loadUserPermissions)
projectDocumentRoutes.get(
  '/',
  requireToolPermission('DOCUMENT', 'READ'),
  validate(projectDocumentsParamsSchema),
  asyncHandler(documentController.listProjectDocuments),
)

export const documentRoutes: Router = Router()
documentRoutes.use(authenticate)
documentRoutes.get(
  '/folders/:id',
  validate(documentFolderParamsSchema),
  asyncHandler(documentController.listFolderContents),
)
documentRoutes.post(
  '/folders',
  authorize('ADMIN'),
  validate(createDocumentFolderSchema),
  asyncHandler(documentController.createFolder),
)
documentRoutes.get('/search', validate(searchDocumentsSchema), asyncHandler(documentController.search))
documentRoutes.get('/trash', validate(listDocumentTrashSchema), asyncHandler(documentController.listTrash))
documentRoutes.get('/:id/versions', validate(documentFileParamsSchema), asyncHandler(documentController.listVersions))
documentRoutes.post(
  '/:id/replace',
  authorize('ADMIN'),
  validate(documentFileParamsSchema),
  upload.single('file'),
  asyncHandler(documentController.replace),
)
documentRoutes.delete(
  '/:id',
  authorize('ADMIN'),
  validate(documentFileParamsSchema),
  asyncHandler(documentController.moveToTrash),
)
documentRoutes.post(
  '/:id/restore',
  authorize('ADMIN'),
  validate(documentFileParamsSchema),
  asyncHandler(documentController.restore),
)
documentRoutes.delete(
  '/:id/permanent',
  authorize('ADMIN'),
  validate(documentFileParamsSchema),
  asyncHandler(documentController.permanentlyDelete),
)
