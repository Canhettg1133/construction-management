import { useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useParams } from 'react-router-dom'
import {
  ChevronDown,
  ChevronRight,
  Download,
  Eye,
  File,
  FileText,
  Folder,
  FolderOpen,
  Image,
  RotateCcw,
  Trash2,
  Upload,
} from 'lucide-react'
import type { DocumentFolder } from '@construction/shared'
import { ErrorState } from '../../../shared/components/feedback/ErrorState'
import { SkeletonCard } from '../../../shared/components/feedback/SkeletonCard'
import { EmptyState } from '../../../shared/components/feedback/EmptyState'
import { Button } from '../../../shared/components/Button'
import {
  createDocumentFolder,
  deleteDocument,
  getDocumentDownloadUrl,
  getDocumentViewUrl,
  listDocumentFolderContents,
  listDocumentTrash,
  listDocumentVersions,
  listProjectDocuments,
  permanentlyDeleteDocument,
  replaceDocumentVersion,
  restoreDocument,
} from '../api/documentApi'
import { uploadProjectFileToFolder } from '../../projects/api/fileApi'
import { useUiStore } from '../../../store/uiStore'
import { useAuthStore } from '../../../store/authStore'
import { DOCUMENT_TAG_SUGGESTIONS, hasTag, toggleTag } from '../constants/tagSuggestions'

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/**
 * Fixes filenames that were incorrectly encoded as Latin1 instead of UTF-8.
 * Example: "TÃ i liá»‡u" -> "Tài liệu"
 */
function sanitizeMangledVietnamese(str: string): string {
  try {
    // Check if the string contains patterns typical of Latin1-misinterpreted UTF-8
    // This is a common heuristic for mangled Vietnamese chars.
    if (/[\u00C0-\u00FF][\u0080-\u00BF]/.test(str)) {
      return decodeURIComponent(escape(str))
    }
  } catch (e) {
    // If decoding fails, return original string
  }
  return str
}

function getKnownFolders(rootFolders: DocumentFolder[], childrenMap: Record<string, DocumentFolder[]>) {
  const result: DocumentFolder[] = []
  const visited = new Set<string>()

  const walk = (folder: DocumentFolder) => {
    if (visited.has(folder.id)) return
    visited.add(folder.id)
    result.push(folder)
    const children = childrenMap[folder.id] ?? []
    for (const child of children) {
      walk(child)
    }
  }

  for (const root of rootFolders) {
    walk(root)
  }
  return result
}

function FileTypeIcon({ mimeType }: { mimeType: string }) {
  if (mimeType.startsWith('image/')) return <Image className="h-4 w-4 text-violet-500" />
  if (mimeType.includes('pdf')) return <FileText className="h-4 w-4 text-red-500" />
  return <File className="h-4 w-4 text-slate-500" />
}

export function DocumentsPage() {
  const { id: projectId } = useParams<{ id: string }>()
  const queryClient = useQueryClient()
  const showToast = useUiStore((s) => s.showToast)
  const { user } = useAuthStore()
  const uploadInputRef = useRef<HTMLInputElement>(null)
  const replaceInputRef = useRef<HTMLInputElement>(null)
  const normalizedSystemRole = user?.systemRole?.toUpperCase?.()
  const canEditDocuments =
    normalizedSystemRole === 'ADMIN'
  const canMoveToTrash = normalizedSystemRole === 'ADMIN'
  const canPermanentlyDelete = normalizedSystemRole === 'ADMIN'

  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null)
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'active' | 'trash'>('active')
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({})
  const [folderChildren, setFolderChildren] = useState<Record<string, DocumentFolder[]>>({})
  const [treeLoadingIds, setTreeLoadingIds] = useState<Record<string, boolean>>({})
  const [uploadTags, setUploadTags] = useState('')
  const [replaceTags, setReplaceTags] = useState('')
  const [folderName, setFolderName] = useState('')
  const [uploadFolderId, setUploadFolderId] = useState<string | null>(null)

  const rootQuery = useQuery({
    queryKey: ['project-documents', projectId],
    queryFn: () => listProjectDocuments(String(projectId)),
    enabled: !!projectId,
  })

  const selectedFolderQuery = useQuery({
    queryKey: ['document-folder', selectedFolderId],
    queryFn: () => listDocumentFolderContents(String(selectedFolderId)),
    enabled: !!selectedFolderId,
  })

  const selectedFileVersionsQuery = useQuery({
    queryKey: ['document-versions', selectedFileId],
    queryFn: () => listDocumentVersions(String(selectedFileId)),
    enabled: !!selectedFileId && viewMode === 'active',
  })

  const trashQuery = useQuery({
    queryKey: ['document-trash', projectId],
    queryFn: () => listDocumentTrash({ projectId: String(projectId) }),
    enabled: !!projectId && viewMode === 'trash',
  })

  useEffect(() => {
    setSelectedFolderId(null)
    setSelectedFileId(null)
    setViewMode('active')
    setExpandedFolders({})
    setFolderChildren({})
    setTreeLoadingIds({})
    setUploadFolderId(null)
  }, [projectId])

  useEffect(() => {
    if (viewMode === 'trash') {
      setSelectedFileId(null)
    }
  }, [viewMode])

  useEffect(() => {
    if (!selectedFolderId) {
      setUploadFolderId(null)
      return
    }
    setUploadFolderId(selectedFolderId)
  }, [selectedFolderId])

  const rootFolders = rootQuery.data?.folders ?? []
  const currentFolders = selectedFolderId ? (selectedFolderQuery.data?.folders ?? []) : (rootQuery.data?.folders ?? [])
  const currentFiles = selectedFolderId ? (selectedFolderQuery.data?.files ?? []) : (rootQuery.data?.files ?? [])

  useEffect(() => {
    if (!selectedFileId) return
    if (!currentFiles.some((file) => file.id === selectedFileId)) {
      setSelectedFileId(null)
    }
  }, [currentFiles, selectedFileId])

  const knownFolders = useMemo(() => getKnownFolders(rootFolders, folderChildren), [rootFolders, folderChildren])

  const selectedFile = useMemo(
    () => currentFiles.find((file) => file.id === selectedFileId) ?? null,
    [currentFiles, selectedFileId],
  )

  async function loadFolderChildren(folderId: string) {
    if (folderChildren[folderId]) return
    setTreeLoadingIds((prev) => ({ ...prev, [folderId]: true }))
    try {
      const payload = await queryClient.fetchQuery({
        queryKey: ['document-folder', folderId],
        queryFn: () => listDocumentFolderContents(folderId),
      })
      setFolderChildren((prev) => ({ ...prev, [folderId]: payload.folders }))
    } finally {
      setTreeLoadingIds((prev) => ({ ...prev, [folderId]: false }))
    }
  }

  const createFolderMutation = useMutation({
    mutationFn: (payload: { projectId: string; name: string; parentId?: string | null }) =>
      createDocumentFolder(payload),
    onSuccess: async (_created, payload) => {
      setFolderName('')
      await queryClient.invalidateQueries({ queryKey: ['project-documents', projectId] })
      if (payload.parentId) {
        setFolderChildren((prev) => {
          const next = { ...prev }
          delete next[payload.parentId as string]
          return next
        })
        await loadFolderChildren(payload.parentId)
      }
      showToast({ type: 'success', title: 'Đã tạo thư mục' })
    },
    onError: (error: unknown) => {
      showToast({
        type: 'error',
        title: 'Không tạo được thư mục',
        description: error instanceof Error ? error.message : 'Có lỗi xảy ra',
      })
    },
  })

  const uploadMutation = useMutation({
    mutationFn: async (files: File[]) => {
      const uploads = files.map((file) =>
        uploadProjectFileToFolder(String(projectId), file, {
          folderId: uploadFolderId ?? undefined,
          tags: uploadTags.trim() || undefined,
        }),
      )
      await Promise.all(uploads)
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['project-documents', projectId] })
      if (selectedFolderId) {
        await queryClient.invalidateQueries({ queryKey: ['document-folder', selectedFolderId] })
      }
      showToast({ type: 'success', title: 'Tải tệp thành công' })
    },
    onError: (error: unknown) => {
      showToast({
        type: 'error',
        title: 'Tải tệp thất bại',
        description: error instanceof Error ? error.message : 'Có lỗi xảy ra',
      })
    },
  })

  const replaceMutation = useMutation({
    mutationFn: (file: File) =>
      replaceDocumentVersion(String(selectedFileId), file, { tags: replaceTags.trim() || undefined }),
    onSuccess: async (created) => {
      setSelectedFileId(created.id)
      setReplaceTags('')
      await queryClient.invalidateQueries({ queryKey: ['project-documents', projectId] })
      if (selectedFolderId) {
        await queryClient.invalidateQueries({ queryKey: ['document-folder', selectedFolderId] })
      }
      await queryClient.invalidateQueries({ queryKey: ['document-versions'] })
      showToast({ type: 'success', title: `Đã tạo phiên bản ${created.version}` })
    },
    onError: (error: unknown) => {
      showToast({
        type: 'error',
        title: 'Không thay thế được tệp',
        description: error instanceof Error ? error.message : 'Có lỗi xảy ra',
      })
    },
  })

  const moveToTrashMutation = useMutation({
    mutationFn: (fileId: string) => deleteDocument(fileId),
    onMutate: async (fileId) => {
      await queryClient.cancelQueries({ queryKey: ['document-versions'] })
      if (selectedFileId === fileId) {
        setSelectedFileId(null)
      }
    },
    onSuccess: async () => {
      setSelectedFileId(null)
      queryClient.removeQueries({ queryKey: ['document-versions'] })
      await queryClient.invalidateQueries({ queryKey: ['project-documents', projectId] })
      await queryClient.invalidateQueries({ queryKey: ['document-trash', projectId] })
      if (selectedFolderId) {
        await queryClient.invalidateQueries({ queryKey: ['document-folder', selectedFolderId] })
      }
      showToast({
        type: 'success',
        title: 'Đã chuyển tài liệu vào thùng rác',
      })
    },
    onError: (error: unknown) => {
      showToast({
        type: 'error',
        title: 'Không thể xóa tài liệu',
        description: error instanceof Error ? error.message : 'Có lỗi xảy ra',
      })
    },
  })

  const restoreMutation = useMutation({
    mutationFn: (fileId: string) => restoreDocument(fileId),
    onSuccess: async () => {
      queryClient.removeQueries({ queryKey: ['document-versions'] })
      await queryClient.invalidateQueries({ queryKey: ['project-documents', projectId] })
      await queryClient.invalidateQueries({ queryKey: ['document-trash', projectId] })
      if (selectedFolderId) {
        await queryClient.invalidateQueries({ queryKey: ['document-folder', selectedFolderId] })
      }
      showToast({
        type: 'success',
        title: 'Đã khôi phục tài liệu',
      })
    },
    onError: (error: unknown) => {
      showToast({
        type: 'error',
        title: 'Không thể khôi phục tài liệu',
        description: error instanceof Error ? error.message : 'Có lỗi xảy ra',
      })
    },
  })

  const permanentDeleteMutation = useMutation({
    mutationFn: (fileId: string) => permanentlyDeleteDocument(fileId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['document-trash', projectId] })
      showToast({
        type: 'success',
        title: 'Đã xóa vĩnh viễn tài liệu',
      })
    },
    onError: (error: unknown) => {
      showToast({
        type: 'error',
        title: 'Không thể xóa vĩnh viễn',
        description: error instanceof Error ? error.message : 'Có lỗi xảy ra',
      })
    },
  })

  const onSubmitCreateFolder = () => {
    if (!projectId || !folderName.trim() || !canEditDocuments) return
    createFolderMutation.mutate({
      projectId,
      name: folderName.trim(),
      parentId: selectedFolderId ?? null,
    })
  }

  const onPickUploadFiles = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!canEditDocuments) return
    const files = Array.from(event.target.files ?? [])
    if (files.length === 0) return
    uploadMutation.mutate(files)
    event.target.value = ''
  }

  const onPickReplaceFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !selectedFileId || !canEditDocuments) return
    replaceMutation.mutate(file)
    event.target.value = ''
  }

  const isPaneLoading = rootQuery.isLoading || (selectedFolderId ? selectedFolderQuery.isLoading : false)
  const isPaneError = rootQuery.isError || (selectedFolderId ? selectedFolderQuery.isError : false)
  const trashedFiles = trashQuery.data ?? []

  function renderFolderNode(folder: DocumentFolder, depth: number) {
    const isExpanded = !!expandedFolders[folder.id]
    const children = folderChildren[folder.id] ?? []
    const isLoadingChildren = !!treeLoadingIds[folder.id]

    return (
      <div key={folder.id}>
        <button
          type="button"
          onClick={async () => {
            setSelectedFolderId(folder.id)
            setExpandedFolders((prev) => ({ ...prev, [folder.id]: !prev[folder.id] }))
            if (!isExpanded) {
              await loadFolderChildren(folder.id)
            }
          }}
          className={`flex w-full items-center gap-1 rounded-lg px-2 py-1.5 text-left text-sm ${
            selectedFolderId === folder.id ? 'bg-brand-50 text-brand-700' : 'text-slate-700 hover:bg-slate-100'
          }`}
          style={{ paddingLeft: `${8 + depth * 14}px` }}
        >
          {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
          {isExpanded ? <FolderOpen className="h-4 w-4" /> : <Folder className="h-4 w-4" />}
          <span className="truncate">{folder.name}</span>
        </button>
        {isExpanded && (
          <div>
            {isLoadingChildren && <p className="px-6 py-1 text-xs text-slate-500">Đang tải...</p>}
            {children.map((child) => renderFolderNode(child, depth + 1))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="page-header">
        <div>
          <h2>Trung tâm tài liệu</h2>
          <p className="page-subtitle">Quản lý thư mục, tệp và phiên bản tài liệu của dự án.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant={viewMode === 'active' ? 'primary' : 'secondary'}
            onClick={() => setViewMode('active')}
          >
            Tài liệu
          </Button>
          <Button
            type="button"
            variant={viewMode === 'trash' ? 'primary' : 'secondary'}
            onClick={() => setViewMode('trash')}
          >
            Thùng rác
          </Button>
        </div>
      </div>

      {viewMode === 'active' ? (
        <>
          <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
            <div className="app-card space-y-3 p-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-800">Cây thư mục</p>
                <button
                  type="button"
                  className={`text-xs ${selectedFolderId ? 'text-brand-600 hover:text-brand-700' : 'text-slate-400'}`}
                  disabled={!selectedFolderId}
                  onClick={() => setSelectedFolderId(null)}
                >
                  Gốc
                </button>
              </div>

              {rootQuery.isLoading ? (
                <SkeletonCard lines={2} />
              ) : rootFolders.length === 0 ? (
                <p className="text-xs text-slate-500">Chưa có thư mục nào.</p>
              ) : (
                <div className="space-y-0.5">{rootFolders.map((folder) => renderFolderNode(folder, 0))}</div>
              )}

              <div className="border-t border-slate-200 pt-3">
                <p className="mb-2 text-xs text-slate-500">
                  Tạo thư mục trong {selectedFolderId ? 'thư mục đang chọn' : 'gốc'}.
                </p>
                <div className="flex gap-2">
                  <input
                    value={folderName}
                    onChange={(e) => setFolderName(e.target.value)}
                    placeholder="Tên thư mục"
                    className="form-input"
                    disabled={!canEditDocuments}
                  />
                  <Button
                    type="button"
                    className="shrink-0"
                    isLoading={createFolderMutation.isPending}
                    disabled={!canEditDocuments}
                    onClick={onSubmitCreateFolder}
                  >
                    Tạo
                  </Button>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="app-card">
                <h3 className="mb-3">Tải tệp lên</h3>
                <div className="grid gap-4 lg:grid-cols-2">
                  <div>
                    <label className="form-label">Thư mục đích tải lên</label>
                    <select
                      className="form-input"
                      value={uploadFolderId ?? ''}
                      onChange={(e) => setUploadFolderId(e.target.value || null)}
                    >
                      <option value="">Gốc</option>
                      {knownFolders.map((folder) => (
                        <option key={folder.id} value={folder.id}>
                          {folder.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="form-label">Nhãn (phân tách bằng dấu phẩy)</label>
                    <input
                      className="form-input"
                      list="document-tag-suggestions"
                      value={uploadTags}
                      onChange={(e) => setUploadTags(e.target.value)}
                      placeholder="biên bản, hợp đồng"
                    />
                    <p className="mt-1 text-xs text-slate-500">Không nhập nhãn sẽ lưu là "Chưa gắn nhãn".</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {DOCUMENT_TAG_SUGGESTIONS.map((tag) => {
                        const active = hasTag(uploadTags, tag)
                        return (
                          <button
                            key={tag}
                            type="button"
                            onClick={() => setUploadTags(toggleTag(uploadTags, tag))}
                            className={`rounded-full border px-2 py-1 text-xs ${
                              active
                                ? 'border-brand-300 bg-brand-50 text-brand-700'
                                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                            }`}
                          >
                            {tag}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </div>
                <div className="mt-4 flex justify-end border-t border-slate-100 pt-4">
                  <input ref={uploadInputRef} type="file" multiple className="hidden" onChange={onPickUploadFiles} />
                  <Button
                    type="button"
                    onClick={() => uploadInputRef.current?.click()}
                    isLoading={uploadMutation.isPending}
                    disabled={!canEditDocuments}
                  >
                    <Upload className="h-4 w-4" />
                    Tải tệp
                  </Button>
                </div>
              </div>

              <div className="app-card">
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <h3>
                      {selectedFolderId
                        ? `Thư mục: ${selectedFolderQuery.data?.folder.name ?? 'Đang tải...'}`
                        : 'Tài liệu thư mục gốc'}
                    </h3>
                    {selectedFolderId && (
                      <Button type="button" size="sm" variant="secondary" onClick={() => setSelectedFolderId(null)}>
                        Về gốc
                      </Button>
                    )}
                  </div>
                  <p className="text-xs text-slate-500">{currentFiles.length} tệp</p>
                </div>

                {isPaneLoading && (
                  <div className="space-y-2">
                    <SkeletonCard lines={2} />
                    <SkeletonCard lines={2} />
                  </div>
                )}

                {isPaneError && <ErrorState message="Không tải được danh sách tài liệu." />}

                {!isPaneLoading && !isPaneError && currentFolders.length === 0 && currentFiles.length === 0 && (
                  <EmptyState title="Thư mục trống" description="Chưa có tệp hoặc thư mục con." />
                )}

                {!isPaneLoading && !isPaneError && (currentFolders.length > 0 || currentFiles.length > 0) && (
                  <div className="space-y-2">
                    {currentFolders.map((folder) => (
                      <button
                        key={folder.id}
                        type="button"
                        onClick={() => setSelectedFolderId(folder.id)}
                        className="flex w-full items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                      >
                        <Folder className="h-4 w-4 text-amber-500" />
                        <span className="truncate">{folder.name}</span>
                      </button>
                    ))}

                    {currentFiles.map((file) => (
                      <div
                        key={file.id}
                        className={`flex items-center gap-3 rounded-xl border px-3 py-2 ${
                          selectedFileId === file.id
                            ? 'border-brand-300 bg-brand-50'
                            : 'border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => setSelectedFileId((prev) => (prev === file.id ? null : file.id))}
                          className="flex min-w-0 flex-1 items-center gap-3 text-left"
                        >
                          <FileTypeIcon mimeType={file.mimeType} />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-slate-800">
                              {sanitizeMangledVietnamese(file.originalName)}
                            </p>
                            <p className="text-xs text-slate-500">
                              v{file.version} - {formatFileSize(file.fileSize)}
                              {file.tags ? ` - ${file.tags}` : ' - Chưa gắn nhãn'}
                            </p>
                          </div>
                        </button>
                        <a
                          href={getDocumentViewUrl(file.projectId, file.id)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
                          title="Xem nhanh"
                        >
                          <Eye className="h-4 w-4" />
                        </a>
                        <a
                          href={getDocumentDownloadUrl(file.projectId, file.id)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
                          title="Tải xuống"
                        >
                          <Download className="h-4 w-4" />
                        </a>
                        {canMoveToTrash && (
                          <button
                            type="button"
                            className="rounded-lg p-1.5 text-red-500 hover:bg-red-50"
                            disabled={moveToTrashMutation.isPending}
                            onClick={() => {
                              if (confirm(`Chuyển tài liệu "${sanitizeMangledVietnamese(file.originalName)}" vào thùng rác?`)) {
                                moveToTrashMutation.mutate(file.id)
                              }
                            }}
                            title="Chuyển vào thùng rác"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {selectedFile && (
                <div className="app-card space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="break-words">{sanitizeMangledVietnamese(selectedFile.originalName)}</h3>
                      <p className="text-xs text-slate-500">
                        Phiên bản hiện tại: v{selectedFile.version}
                        {selectedFile.tags ? ` - ${selectedFile.tags}` : ' - Chưa gắn nhãn'}
                      </p>
                    </div>
                    <a
                      href={getDocumentDownloadUrl(selectedFile.projectId, selectedFile.id)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    >
                      Tải xuống
                    </a>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                    <input
                      className="form-input"
                      list="document-tag-suggestions"
                      value={replaceTags}
                      onChange={(e) => setReplaceTags(e.target.value)}
                      placeholder="Nhãn cho phiên bản mới (tùy chọn)"
                    />
                    <div>
                      <input ref={replaceInputRef} type="file" className="hidden" onChange={onPickReplaceFile} />
                      <Button
                        type="button"
                        variant="secondary"
                        isLoading={replaceMutation.isPending}
                        disabled={!canEditDocuments}
                        onClick={() => replaceInputRef.current?.click()}
                        className="w-full sm:w-auto"
                      >
                        Thay thế tệp
                      </Button>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {DOCUMENT_TAG_SUGGESTIONS.map((tag) => {
                      const active = hasTag(replaceTags, tag)
                      return (
                        <button
                          key={`replace-${tag}`}
                          type="button"
                          onClick={() => setReplaceTags(toggleTag(replaceTags, tag))}
                          className={`rounded-full border px-2 py-1 text-xs ${
                            active
                              ? 'border-brand-300 bg-brand-50 text-brand-700'
                              : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          {tag}
                        </button>
                      )
                    })}
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-slate-700">Lịch sử phiên bản</p>
                    {selectedFileVersionsQuery.isLoading && <SkeletonCard lines={2} />}
                    {selectedFileVersionsQuery.isError && <ErrorState message="Không tải được lịch sử phiên bản." />}
                    {!selectedFileVersionsQuery.isLoading &&
                      !selectedFileVersionsQuery.isError &&
                      (selectedFileVersionsQuery.data ?? []).map((version) => (
                        <div
                          key={version.id}
                          className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2"
                        >
                          <div>
                            <p className="text-sm font-medium text-slate-800">Phiên bản {version.version}</p>
                            <p className="text-xs text-slate-500">
                              {new Date(version.createdAt).toLocaleString('vi-VN')}
                              {version.tags ? ` - ${version.tags}` : ' - Chưa gắn nhãn'}
                            </p>
                          </div>
                          <a
                            href={getDocumentDownloadUrl(version.projectId, version.id)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
                          >
                            <Download className="h-4 w-4" />
                          </a>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          </div>
          <datalist id="document-tag-suggestions">
            {DOCUMENT_TAG_SUGGESTIONS.map((tag) => (
              <option key={tag} value={tag} />
            ))}
          </datalist>
        </>
      ) : (
        <div className="app-card space-y-3">
          <div className="flex items-center justify-between">
            <h3>Thùng rác tài liệu</h3>
            <p className="text-xs text-slate-500">{trashedFiles.length} tệp</p>
          </div>

          {trashQuery.isLoading && (
            <div className="space-y-2">
              <SkeletonCard lines={2} />
              <SkeletonCard lines={2} />
            </div>
          )}

          {trashQuery.isError && <ErrorState message="Không tải được thùng rác tài liệu." />}

          {!trashQuery.isLoading && !trashQuery.isError && trashedFiles.length === 0 && (
            <EmptyState title="Thùng rác trống" description="Chưa có tài liệu nào bị xóa." />
          )}

          {!trashQuery.isLoading && !trashQuery.isError && trashedFiles.length > 0 && (
            <div className="space-y-2">
              {trashedFiles.map((file) => {
                const isRestoring = restoreMutation.isPending && restoreMutation.variables === file.id
                const isDeletingPermanently =
                  permanentDeleteMutation.isPending && permanentDeleteMutation.variables === file.id

                return (
                  <div
                    key={file.id}
                    className="flex flex-col gap-2 rounded-xl border border-slate-200 px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-800">
                        {sanitizeMangledVietnamese(file.originalName)}
                      </p>
                      <p className="text-xs text-slate-500">
                        v{file.version}
                        {file.deletedAt ? ` - Đã xóa lúc ${new Date(file.deletedAt).toLocaleString('vi-VN')}` : ''}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        disabled={!canMoveToTrash}
                        isLoading={isRestoring}
                        onClick={() => {
                          restoreMutation.mutate(file.id)
                        }}
                      >
                        <RotateCcw className="h-4 w-4" />
                        Khôi phục
                      </Button>
                      {canPermanentlyDelete && (
                        <Button
                          type="button"
                          size="sm"
                          variant="danger"
                          isLoading={isDeletingPermanently}
                          onClick={() => {
                            if (confirm(`Xóa vĩnh viễn tài liệu "${sanitizeMangledVietnamese(file.originalName)}"?`)) {
                              permanentDeleteMutation.mutate(file.id)
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                          Xóa vĩnh viễn
                        </Button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
