import api from '../../../config/api'
import type { DocumentFolder, ProjectFile } from '@construction/shared'

interface ApiSingleResponse<T> {
  success: true
  data: T
}

interface SearchDocumentsParams {
  q?: string
  projectId?: string
  tags?: string
}

interface ListTrashParams {
  projectId?: string
}

export interface ProjectDocumentsPayload {
  folders: DocumentFolder[]
  files: ProjectFile[]
}

export interface FolderContentsPayload {
  folder: DocumentFolder
  folders: DocumentFolder[]
  files: ProjectFile[]
}

export async function listProjectDocuments(projectId: string) {
  const res = await api.get<ApiSingleResponse<ProjectDocumentsPayload>>(`/projects/${projectId}/documents`)
  return res.data.data
}

export async function listDocumentFolderContents(folderId: string) {
  const res = await api.get<ApiSingleResponse<FolderContentsPayload>>(`/documents/folders/${folderId}`)
  return res.data.data
}

export async function createDocumentFolder(payload: { projectId: string; name: string; parentId?: string | null }) {
  const res = await api.post<ApiSingleResponse<DocumentFolder>>('/documents/folders', payload)
  return res.data.data
}

export async function searchDocuments(params?: SearchDocumentsParams) {
  const res = await api.get<ApiSingleResponse<ProjectFile[]>>('/documents/search', {
    params: {
      q: params?.q,
      project_id: params?.projectId,
      tags: params?.tags,
    },
  })
  return res.data.data
}

export async function listDocumentTrash(params?: ListTrashParams) {
  const res = await api.get<ApiSingleResponse<ProjectFile[]>>('/documents/trash', {
    params: {
      project_id: params?.projectId,
    },
  })
  return res.data.data
}

export async function listDocumentVersions(fileId: string) {
  const res = await api.get<ApiSingleResponse<ProjectFile[]>>(`/documents/${fileId}/versions`)
  return res.data.data
}

export async function replaceDocumentVersion(fileId: string, file: File, options?: { tags?: string }) {
  const formData = new FormData()
  formData.append('file', file)
  if (options?.tags) {
    formData.append('tags', options.tags)
  }
  const res = await api.post<ApiSingleResponse<ProjectFile>>(`/documents/${fileId}/replace`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return res.data.data
}

export async function deleteDocument(fileId: string) {
  const res = await api.delete<ApiSingleResponse<ProjectFile>>(`/documents/${fileId}`)
  return res.data.data
}

export async function restoreDocument(fileId: string) {
  const res = await api.post<ApiSingleResponse<ProjectFile>>(`/documents/${fileId}/restore`)
  return res.data.data
}

export async function permanentlyDeleteDocument(fileId: string) {
  await api.delete(`/documents/${fileId}/permanent`)
}

export function getDocumentDownloadUrl(projectId: string, fileId: string) {
  return `/api/v1/projects/${projectId}/files/${fileId}/download`
}

export function getDocumentViewUrl(projectId: string, fileId: string) {
  return `/api/v1/projects/${projectId}/files/${fileId}/view`
}
