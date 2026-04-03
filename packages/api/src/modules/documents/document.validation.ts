import { z } from 'zod'

export const projectDocumentsParamsSchema = z.object({
  params: z.object({
    projectId: z.string().uuid(),
  }),
})

export const documentFolderParamsSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
})

export const documentFileParamsSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
})

export const createDocumentFolderSchema = z.object({
  body: z.object({
    projectId: z.string().uuid(),
    name: z.string().trim().min(1).max(200),
    parentId: z.string().uuid().optional().nullable(),
  }),
})

export const searchDocumentsSchema = z.object({
  query: z.object({
    q: z.string().trim().max(200).optional(),
    project_id: z.string().uuid().optional(),
    tags: z.string().trim().max(500).optional(),
  }),
})

export const listDocumentTrashSchema = z.object({
  query: z.object({
    project_id: z.string().uuid().optional(),
  }),
})
