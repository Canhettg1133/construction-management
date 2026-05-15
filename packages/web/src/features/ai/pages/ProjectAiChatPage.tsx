import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft,
  Check,
  Menu,
  MessageSquarePlus,
  PanelLeftClose,
  PanelLeftOpen,
  Pencil,
  Plus,
  ShieldCheck,
  Trash2,
  X,
} from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import {
  aiApi,
  type AiMessage,
  type AiMessageIntent,
  type AiQuickPromptPreset,
  type AiThread,
  type SendAiMessageResponse,
} from '../api/aiApi'
import { AiChatBox, type QuickPrompt } from '../components/AiChatBox'
import { getProject } from '../../projects/api/projectApi'
import { ErrorState } from '../../../shared/components/feedback/ErrorState'
import { SkeletonCard } from '../../../shared/components/feedback/SkeletonCard'
import { ROUTES } from '../../../shared/constants/routes'
import { usePermission } from '../../../shared/hooks/usePermission'
import { useAuthStore } from '../../../store/authStore'
import { useUiStore } from '../../../store/uiStore'

const QUICK_PROMPTS: QuickPrompt[] = [
  {
    preset: 'WEEKLY_SUMMARY',
    label: 'Tóm tắt tuần này',
    description: 'Tiến độ, công việc nổi bật, báo cáo và rủi ro chính.',
    content: 'Tóm tắt tình hình dự án trong tuần này, nêu tiến độ, công việc nổi bật, báo cáo và rủi ro chính.',
    intent: 'CHAT',
  },
  {
    preset: 'OVERDUE_TASKS',
    label: 'Việc quá hạn',
    description: 'Hạn chót, người phụ trách và mức độ ảnh hưởng.',
    content: 'Liệt kê công việc đang quá hạn, kèm hạn chót, người phụ trách và mức độ ảnh hưởng.',
    intent: 'CHAT',
  },
  {
    preset: 'SCHEDULE_RISK',
    label: 'Rủi ro tiến độ',
    description: 'Dựa trên công việc trễ, báo cáo ngày và mốc kế hoạch.',
    content: 'Phân tích rủi ro tiến độ hiện tại dựa trên công việc trễ, báo cáo ngày và mốc kế hoạch.',
    intent: 'CHAT',
  },
  {
    preset: 'LOW_STOCK_CHECK',
    label: 'Tồn kho thấp',
    description: 'Vật tư dưới ngưỡng, thiếu hụt và nguy cơ ảnh hưởng thi công.',
    content: 'Kiểm tra vật tư có tồn kho thấp, thiếu hụt và nguy cơ ảnh hưởng thi công.',
    intent: 'CHAT',
  },
  {
    preset: 'SAFETY_QUALITY_SUMMARY',
    label: 'An toàn/chất lượng',
    description: 'Sự cố, lỗi đang mở, checklist cần chú ý.',
    content: 'Tóm tắt an toàn và chất lượng, gồm sự cố, lỗi đang mở và checklist cần chú ý.',
    intent: 'CHAT',
  },
  {
    preset: 'DAILY_REPORT_DRAFT',
    label: 'Báo cáo hôm nay',
    description: 'Tạo bản nháp để người dùng xem và chỉnh trước khi lưu.',
    content: 'Gợi ý nội dung báo cáo ngày hôm nay dưới dạng bản nháp để tôi xem và chỉnh trước khi lưu.',
    intent: 'DRAFT_DAILY_REPORT',
    requiresDraftPermission: true,
    badge: 'Bản nháp',
  },
]

function createRunId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `run-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function threadTime(value: string) {
  return new Date(value).toLocaleString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
  })
}

function messageTimestamp(value: string) {
  const timestamp = Date.parse(value)
  return Number.isFinite(timestamp) ? timestamp : null
}

function mergeRunMessages(current: AiMessage[] | undefined, userMessage: AiMessage, assistantMessage: AiMessage) {
  const replacementIds = new Set([userMessage.id, assistantMessage.id])
  const userTimestamp = messageTimestamp(userMessage.createdAt)
  const retainedMessages = (current ?? []).filter((message) => {
    if (replacementIds.has(message.id) || message.deletedAt) {
      return false
    }

    const currentTimestamp = messageTimestamp(message.createdAt)
    if (userTimestamp !== null && currentTimestamp !== null && currentTimestamp > userTimestamp) {
      return false
    }

    return true
  })

  return [...retainedMessages, userMessage, assistantMessage].sort((left, right) => {
    const leftTimestamp = messageTimestamp(left.createdAt) ?? 0
    const rightTimestamp = messageTimestamp(right.createdAt) ?? 0
    return leftTimestamp - rightTimestamp || left.id.localeCompare(right.id)
  })
}

export function ProjectAiChatPage() {
  const { id } = useParams<{ id: string }>()
  const projectId = id ?? ''
  const queryClient = useQueryClient()
  const userId = useAuthStore((state) => state.user?.id ?? null)
  const showToast = useUiStore((state) => state.showToast)
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [mobileThreadsOpen, setMobileThreadsOpen] = useState(false)
  const [editingThreadId, setEditingThreadId] = useState<string | null>(null)
  const [editingThreadTitle, setEditingThreadTitle] = useState('')
  const [activeRunId, setActiveRunId] = useState<string | null>(null)
  const [pendingMessages, setPendingMessages] = useState<AiMessage[]>([])

  const { has: canDraft, isLoading: isLoadingDraftPermission } = usePermission({
    projectId,
    toolId: 'AI_ASSISTANT',
    minLevel: 'STANDARD',
  })
  const { has: canReadTasks, isLoading: isLoadingTaskPermission } = usePermission({
    projectId,
    toolId: 'TASK',
    minLevel: 'READ',
  })
  const { has: canReadWarehouse, isLoading: isLoadingWarehousePermission } = usePermission({
    projectId,
    toolId: 'WAREHOUSE',
    minLevel: 'READ',
  })
  const { has: canReadSafety, isLoading: isLoadingSafetyPermission } = usePermission({
    projectId,
    toolId: 'SAFETY',
    minLevel: 'READ',
  })
  const { has: canReadQuality, isLoading: isLoadingQualityPermission } = usePermission({
    projectId,
    toolId: 'QUALITY',
    minLevel: 'READ',
  })

  const projectQuery = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => getProject(projectId),
    enabled: Boolean(projectId),
    staleTime: 5 * 60 * 1000,
  })

  const threadsQuery = useQuery({
    queryKey: ['ai-threads', projectId, userId],
    queryFn: () => aiApi.listThreads(projectId),
    enabled: Boolean(projectId && userId),
  })

  const statusQuery = useQuery({
    queryKey: ['project-ai-status', projectId],
    queryFn: () => aiApi.getProjectStatus(projectId),
    enabled: Boolean(projectId),
    staleTime: 60_000,
  })

  const threads = threadsQuery.data ?? []
  const quickPrompts = useMemo(
    () =>
      QUICK_PROMPTS.map((prompt) => {
        const permissionLoading =
          isLoadingTaskPermission ||
          isLoadingWarehousePermission ||
          isLoadingSafetyPermission ||
          isLoadingQualityPermission ||
          isLoadingDraftPermission

        if (permissionLoading) {
          return { ...prompt, disabledReason: 'Đang kiểm tra quyền dữ liệu dự án...' }
        }

        if (prompt.preset === 'OVERDUE_TASKS' && !canReadTasks) {
          return { ...prompt, disabledReason: 'Bạn chưa có quyền xem công việc của dự án.' }
        }
        if (prompt.preset === 'LOW_STOCK_CHECK' && !canReadWarehouse) {
          return { ...prompt, disabledReason: 'Bạn chưa có quyền xem kho vật tư.' }
        }
        if (prompt.preset === 'SAFETY_QUALITY_SUMMARY' && !canReadSafety && !canReadQuality) {
          return { ...prompt, disabledReason: 'Bạn chưa có quyền xem an toàn hoặc chất lượng.' }
        }
        if (prompt.preset === 'DAILY_REPORT_DRAFT' && !canDraft) {
          return { ...prompt, disabledReason: 'Cần quyền STANDARD trên Trợ lý AI để tạo bản nháp.' }
        }

        return prompt
      }),
    [
      canDraft,
      canReadQuality,
      canReadSafety,
      canReadTasks,
      canReadWarehouse,
      isLoadingQualityPermission,
      isLoadingDraftPermission,
      isLoadingSafetyPermission,
      isLoadingTaskPermission,
      isLoadingWarehousePermission,
    ],
  )
  const selectedThread = useMemo(
    () => threads.find((thread) => thread.id === selectedThreadId) ?? threads[0] ?? null,
    [threads, selectedThreadId],
  )

  useEffect(() => {
    if (threads.length === 0) {
      setSelectedThreadId(null)
      return
    }
    if (!selectedThreadId || !threads.some((thread) => thread.id === selectedThreadId)) {
      setSelectedThreadId(threads[0].id)
    }
  }, [selectedThreadId, threads])

  const messagesQuery = useQuery({
    queryKey: ['ai-messages', projectId, selectedThread?.id, userId],
    queryFn: () => aiApi.listMessages(projectId, selectedThread!.id),
    enabled: Boolean(projectId && selectedThread?.id && userId),
  })

  const invalidateChat = async (threadId?: string | null) => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['ai-threads', projectId, userId] }),
      queryClient.invalidateQueries({ queryKey: ['ai-messages', projectId, threadId ?? selectedThread?.id, userId] }),
    ])
  }

  const cacheRunMessages = (result: SendAiMessageResponse) => {
    queryClient.setQueryData<AiMessage[]>(['ai-messages', projectId, result.userMessage.threadId, userId], (current) =>
      mergeRunMessages(current, result.userMessage, result.assistantMessage),
    )
  }

  const createThreadMutation = useMutation({
    mutationFn: (payload: { title?: string }) => aiApi.createThread(projectId, payload),
    onSuccess: async (thread) => {
      setSelectedThreadId(thread.id)
      setMobileThreadsOpen(false)
      await invalidateChat(thread.id)
    },
  })

  const renameThreadMutation = useMutation({
    mutationFn: (payload: { threadId: string; title: string }) =>
      aiApi.updateThread(projectId, payload.threadId, { title: payload.title }),
    onSuccess: async () => {
      setEditingThreadId(null)
      setEditingThreadTitle('')
      await invalidateChat()
      showToast({ type: 'success', title: 'Đã đổi tên cuộc trò chuyện' })
    },
    onError: (error: unknown) => {
      showToast({
        type: 'error',
        title: 'Không đổi tên được',
        description: error instanceof Error ? error.message : 'Vui lòng thử lại sau',
      })
    },
  })

  const deleteThreadMutation = useMutation({
    mutationFn: (threadId: string) => aiApi.deleteThread(projectId, threadId),
    onSuccess: async (_, threadId) => {
      const remainingThreads = threads.filter((thread) => thread.id !== threadId)
      queryClient.setQueryData<AiThread[]>(['ai-threads', projectId, userId], remainingThreads)
      if (selectedThreadId === threadId) {
        setSelectedThreadId(remainingThreads[0]?.id ?? null)
      }
      await invalidateChat(threadId)
      showToast({ type: 'success', title: 'Đã xóa cuộc trò chuyện' })
    },
    onError: (error: unknown) => {
      showToast({
        type: 'error',
        title: 'Không xóa được cuộc trò chuyện',
        description: error instanceof Error ? error.message : 'Vui lòng thử lại sau',
      })
    },
  })

  const sendMessageMutation = useMutation({
    mutationFn: async (payload: {
      content: string
      intent: AiMessageIntent
      quickPromptPreset?: AiQuickPromptPreset
      runId: string
    }) => {
      let thread: AiThread | null = selectedThread
      if (!thread) {
        thread = await aiApi.createThread(projectId, { title: payload.content.slice(0, 120) })
        setSelectedThreadId(thread.id)
        setPendingMessages((current) =>
          current.map((message) =>
            message.id.endsWith(payload.runId) ? { ...message, threadId: thread!.id } : message,
          ),
        )
      }
      let streamedAssistantContent = ''
      return aiApi.sendMessageStream(projectId, thread.id, payload, {
        onAssistantDelta: (delta) => {
          streamedAssistantContent += delta
          setPendingMessages((current) =>
            current.map((message) =>
              message.id === `pending-assistant-${payload.runId}`
                ? {
                    ...message,
                    content: streamedAssistantContent,
                  }
                : message,
            ),
          )
        },
      })
    },
    onSuccess: async (result) => {
      cacheRunMessages(result)
      const runId = result.runId
      if (runId) {
        setPendingMessages((current) => current.filter((message) => !message.id.endsWith(runId)))
      }
      await invalidateChat(result.userMessage.threadId)
      if (result.assistantMessage.errorCode && result.assistantMessage.errorCode !== 'AI_PROVIDER_ABORTED') {
        showToast({
          type: 'error',
          title: 'Nhà cung cấp AI đang lỗi',
          description: 'Câu hỏi đã được lưu, vui lòng kiểm tra cấu hình nhà cung cấp.',
        })
      }
    },
    onError: (error: unknown, variables) => {
      setPendingMessages((current) =>
        current.map((message) =>
          message.id === `pending-assistant-${variables.runId}`
            ? {
                ...message,
                clientStatus: 'error',
                errorCode: 'CLIENT_SEND_ERROR',
                content: 'Không gửi được câu hỏi. Nội dung của bạn vẫn đang hiển thị tạm thời để kiểm tra lại.',
              }
            : message,
        ),
      )
      showToast({
        type: 'error',
        title: 'Không gửi được câu hỏi',
        description: error instanceof Error ? error.message : 'Vui lòng thử lại sau',
      })
    },
    onSettled: () => setActiveRunId(null),
  })

  const editMessageMutation = useMutation({
    mutationFn: (payload: { messageId: string; content: string; runId: string }) =>
      aiApi.updateMessage(projectId, selectedThread!.id, payload.messageId, {
        content: payload.content,
        rerun: true,
        runId: payload.runId,
      }),
    onSuccess: async (result) => {
      cacheRunMessages(result)
      const runId = result.runId
      if (runId) {
        setPendingMessages((current) => current.filter((message) => !message.id.endsWith(runId)))
      }
      await invalidateChat(result.userMessage.threadId)
    },
    onError: (error: unknown, variables) => {
      setPendingMessages((current) =>
        current.map((message) =>
          message.id === `pending-assistant-${variables.runId}`
            ? {
                ...message,
                clientStatus: 'error',
                errorCode: 'CLIENT_EDIT_ERROR',
                content: 'Không chạy lại được phản hồi sau khi sửa tin nhắn.',
              }
            : message,
        ),
      )
      showToast({
        type: 'error',
        title: 'Không sửa được tin nhắn',
        description: error instanceof Error ? error.message : 'Vui lòng thử lại sau',
      })
    },
    onSettled: () => setActiveRunId(null),
  })

  const retryMessageMutation = useMutation({
    mutationFn: (payload: { messageId: string; runId: string }) =>
      aiApi.retryMessage(projectId, selectedThread!.id, payload.messageId, { runId: payload.runId }),
    onSuccess: async (result) => {
      cacheRunMessages(result)
      const runId = result.runId
      if (runId) {
        setPendingMessages((current) => current.filter((message) => !message.id.endsWith(runId)))
      }
      await invalidateChat(result.userMessage.threadId)
    },
    onError: (error: unknown, variables) => {
      setPendingMessages((current) =>
        current.map((message) =>
          message.id === `pending-assistant-${variables.runId}`
            ? {
                ...message,
                clientStatus: 'error',
                errorCode: 'CLIENT_RETRY_ERROR',
                content: 'Không gửi lại được câu trả lời.',
              }
            : message,
        ),
      )
      showToast({
        type: 'error',
        title: 'Không gửi lại được',
        description: error instanceof Error ? error.message : 'Vui lòng thử lại sau',
      })
    },
    onSettled: () => setActiveRunId(null),
  })

  const cancelRunMutation = useMutation({
    mutationFn: (runId: string) => aiApi.cancelRun(projectId, runId),
    onSuccess: (result) => {
      showToast({
        type: 'info',
        title: result.cancelled ? 'Đang dừng phản hồi AI' : 'Lượt gọi AI đã kết thúc',
      })
    },
    onError: (error: unknown) => {
      showToast({
        type: 'error',
        title: 'Không dừng được AI',
        description: error instanceof Error ? error.message : 'Vui lòng thử lại sau',
      })
    },
  })

  const appendPendingMessages = (runId: string, content: string, threadId: string | null, includeUser = true) => {
    const now = new Date().toISOString()
    const effectiveThreadId = threadId ?? '__pending-thread__'
    const nextMessages: AiMessage[] = [
      ...(includeUser
        ? [
            {
              id: `pending-user-${runId}`,
              threadId: effectiveThreadId,
              projectId,
              userId: null,
              role: 'USER' as const,
              content,
              provider: null,
              model: null,
              latencyMs: null,
              contextSources: null,
              errorCode: null,
              createdAt: now,
              updatedAt: now,
              editedAt: null,
              deletedAt: null,
              clientStatus: 'pending' as const,
            },
          ]
        : []),
      {
        id: `pending-assistant-${runId}`,
        threadId: effectiveThreadId,
        projectId,
        userId: null,
        role: 'ASSISTANT' as const,
        content: 'Đang phân tích dữ liệu...',
        provider: null,
        model: null,
        latencyMs: null,
        contextSources: null,
        errorCode: null,
        createdAt: now,
        updatedAt: now,
        editedAt: null,
        deletedAt: null,
        clientStatus: 'pending' as const,
      },
    ]

    setPendingMessages((current) => [...current.filter((message) => !message.id.endsWith(runId)), ...nextMessages])
  }

  const runWithId = async <T,>(callback: (runId: string) => Promise<T>) => {
    const runId = createRunId()
    setActiveRunId(runId)
    return callback(runId)
  }

  const handleSend = async (content: string, intent: AiMessageIntent, quickPromptPreset?: AiQuickPromptPreset) => {
    await runWithId((runId) => {
      appendPendingMessages(runId, content, selectedThread?.id ?? null, true)
      return sendMessageMutation.mutateAsync({ content, intent, quickPromptPreset, runId })
    })
  }

  const handleEditMessage = async (messageId: string, content: string) => {
    await runWithId((runId) => {
      appendPendingMessages(runId, content, selectedThread?.id ?? null, false)
      return editMessageMutation.mutateAsync({ messageId, content, runId })
    })
  }

  const handleRetryMessage = async (messageId: string) => {
    if (!selectedThread) {
      return
    }
    await runWithId((runId) => {
      appendPendingMessages(runId, 'Đang thử lại câu trả lời...', selectedThread.id, false)
      return retryMessageMutation.mutateAsync({ messageId, runId })
    })
  }

  const handleStop = async () => {
    if (!activeRunId || cancelRunMutation.isPending) {
      return
    }
    await cancelRunMutation.mutateAsync(activeRunId)
  }

  const handleCopy = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content)
      showToast({ type: 'success', title: 'Đã sao chép nội dung' })
    } catch {
      showToast({ type: 'error', title: 'Không thể sao chép vào clipboard' })
    }
  }

  const handleStartRename = (thread: AiThread) => {
    setEditingThreadId(thread.id)
    setEditingThreadTitle(thread.title)
  }

  const handleRenameSubmit = (threadId: string) => {
    const title = editingThreadTitle.trim()
    if (!title) {
      return
    }
    renameThreadMutation.mutate({ threadId, title })
  }

  const handleDeleteThread = (thread: AiThread) => {
    if (!window.confirm(`Xóa cuộc trò chuyện "${thread.title}"?`)) {
      return
    }
    deleteThreadMutation.mutate(thread.id)
  }

  const isRunning = sendMessageMutation.isPending || editMessageMutation.isPending || retryMessageMutation.isPending
  const persistedMessages = messagesQuery.data ?? []
  const activeThreadId = selectedThread?.id ?? pendingMessages[0]?.threadId ?? null
  const messages = [
    ...persistedMessages,
    ...pendingMessages.filter(
      (message) => !activeThreadId || message.threadId === activeThreadId || message.threadId === '__pending-thread__',
    ),
  ]
  const providerStatus =
    statusQuery.data?.displayText ??
    (statusQuery.isLoading ? 'Đang kiểm tra cấu hình nhà cung cấp AI...' : 'Chưa tải được trạng thái nhà cung cấp AI.')

  if (threadsQuery.isLoading || projectQuery.isLoading) {
    return (
      <div className="space-y-3">
        <SkeletonCard lines={2} />
        <SkeletonCard lines={5} />
      </div>
    )
  }

  if (threadsQuery.isError) {
    return <ErrorState message="Không tải được Trợ lý AI của dự án." />
  }

  if (projectQuery.isError) {
    return <ErrorState message="Không tải được thông tin dự án." />
  }

  return (
    <div className="h-[calc(100vh-4.5rem)] overflow-hidden lg:h-[calc(100vh-5rem)]">
      <div
        className={`grid h-full min-h-0 gap-3 ${
          sidebarOpen ? 'xl:grid-cols-[20rem_minmax(0,1fr)]' : 'xl:grid-cols-[4.75rem_minmax(0,1fr)]'
        }`}
      >
        <ThreadSidebar
          threads={threads}
          selectedThreadId={selectedThread?.id ?? null}
          collapsed={!sidebarOpen}
          editingThreadId={editingThreadId}
          editingThreadTitle={editingThreadTitle}
          isCreating={createThreadMutation.isPending}
          isMutating={renameThreadMutation.isPending || deleteThreadMutation.isPending}
          onToggle={() => setSidebarOpen((value) => !value)}
          onSelect={(threadId) => {
            setSelectedThreadId(threadId)
            setMobileThreadsOpen(false)
          }}
          onCreate={() => createThreadMutation.mutate({ title: 'Cuộc trò chuyện mới' })}
          onStartRename={handleStartRename}
          onRenameTitleChange={setEditingThreadTitle}
          onRenameSubmit={handleRenameSubmit}
          onCancelRename={() => {
            setEditingThreadId(null)
            setEditingThreadTitle('')
          }}
          onDelete={handleDeleteThread}
        />

        <section className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <header className="shrink-0 border-b border-slate-200 bg-white px-3 py-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <Link
                  to={ROUTES.PROJECT_DETAIL(projectId)}
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span className="hidden sm:inline">Quay về dự án</span>
                </Link>
                <button
                  type="button"
                  onClick={() => setMobileThreadsOpen(true)}
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 xl:hidden"
                >
                  <Menu className="h-4 w-4" />
                  <span className="hidden sm:inline">Lịch sử</span>
                </button>
                <div className="min-w-0">
                  <h1 className="truncate text-sm font-semibold text-slate-950 sm:text-base">
                    Trợ lý AI · {projectQuery.data?.name ?? 'Dự án'}
                  </h1>
                  <div className="mt-0.5 flex max-w-full items-center gap-1.5 text-[11px] font-medium text-slate-500 sm:text-xs">
                    <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                    <span className="truncate">{providerStatus}</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => createThreadMutation.mutate({ title: 'Cuộc trò chuyện mới' })}
                disabled={createThreadMutation.isPending}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-brand-600 px-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {createThreadMutation.isPending ? (
                  <Plus className="h-4 w-4 animate-spin" />
                ) : (
                  <MessageSquarePlus className="h-4 w-4" />
                )}
                Tạo cuộc trò chuyện
              </button>
            </div>
          </header>

          <AiChatBox
            messages={messages}
            quickPrompts={quickPrompts}
            canDraft={canDraft}
            isLoadingMessages={messagesQuery.isFetching}
            isSending={isRunning}
            isCancelling={cancelRunMutation.isPending}
            onSend={handleSend}
            onStop={handleStop}
            onCopy={handleCopy}
            onEditMessage={handleEditMessage}
            onRetryMessage={handleRetryMessage}
          />
        </section>
      </div>

      {mobileThreadsOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/40 p-3 xl:hidden" onClick={() => setMobileThreadsOpen(false)}>
          <div className="h-full max-w-sm" onClick={(event) => event.stopPropagation()}>
            <ThreadSidebar
              threads={threads}
              selectedThreadId={selectedThread?.id ?? null}
              collapsed={false}
              editingThreadId={editingThreadId}
              editingThreadTitle={editingThreadTitle}
              isCreating={createThreadMutation.isPending}
              isMutating={renameThreadMutation.isPending || deleteThreadMutation.isPending}
              isMobile
              onToggle={() => setMobileThreadsOpen(false)}
              onSelect={(threadId) => {
                setSelectedThreadId(threadId)
                setMobileThreadsOpen(false)
              }}
              onCreate={() => createThreadMutation.mutate({ title: 'Cuộc trò chuyện mới' })}
              onStartRename={handleStartRename}
              onRenameTitleChange={setEditingThreadTitle}
              onRenameSubmit={handleRenameSubmit}
              onCancelRename={() => {
                setEditingThreadId(null)
                setEditingThreadTitle('')
              }}
              onDelete={handleDeleteThread}
            />
          </div>
        </div>
      )}
    </div>
  )
}

interface ThreadSidebarProps {
  threads: AiThread[]
  selectedThreadId: string | null
  collapsed: boolean
  editingThreadId: string | null
  editingThreadTitle: string
  isCreating: boolean
  isMutating: boolean
  isMobile?: boolean
  onToggle: () => void
  onSelect: (threadId: string) => void
  onCreate: () => void
  onStartRename: (thread: AiThread) => void
  onRenameTitleChange: (title: string) => void
  onRenameSubmit: (threadId: string) => void
  onCancelRename: () => void
  onDelete: (thread: AiThread) => void
}

function ThreadSidebar({
  threads,
  selectedThreadId,
  collapsed,
  editingThreadId,
  editingThreadTitle,
  isCreating,
  isMutating,
  isMobile = false,
  onToggle,
  onSelect,
  onCreate,
  onStartRename,
  onRenameTitleChange,
  onRenameSubmit,
  onCancelRename,
  onDelete,
}: ThreadSidebarProps) {
  return (
    <aside
      className={`hidden min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm xl:flex ${
        isMobile ? '!flex h-full' : ''
      }`}
    >
      <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-3 py-3">
        {!collapsed && (
          <div className="min-w-0">
            <h2 className="truncate text-sm font-semibold text-slate-950">Cuộc trò chuyện</h2>
            <p className="text-xs text-slate-500">Riêng tư theo tài khoản</p>
          </div>
        )}
        <div className={`flex items-center gap-2 ${collapsed ? 'w-full flex-col' : ''}`}>
          <button
            type="button"
            onClick={onCreate}
            disabled={isCreating}
            className="grid h-9 w-9 place-items-center rounded-xl border border-slate-200 text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
            title="Tạo cuộc trò chuyện mới"
          >
            {isCreating ? <Plus className="h-4 w-4 animate-spin" /> : <MessageSquarePlus className="h-4 w-4" />}
          </button>
          <button
            type="button"
            onClick={onToggle}
            className="grid h-9 w-9 place-items-center rounded-xl border border-slate-200 text-slate-600 transition hover:bg-slate-50"
            title={isMobile ? 'Đóng lịch sử' : collapsed ? 'Mở lịch sử' : 'Thu gọn lịch sử'}
          >
            {isMobile ? (
              <X className="h-4 w-4" />
            ) : collapsed ? (
              <PanelLeftOpen className="h-4 w-4" />
            ) : (
              <PanelLeftClose className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
        {threads.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-center text-sm text-slate-500">
            {collapsed ? 'Trống' : 'Chưa có cuộc trò chuyện AI nào.'}
          </div>
        ) : (
          threads.map((thread) => {
            const isActive = selectedThreadId === thread.id
            const isEditing = editingThreadId === thread.id

            return (
              <div
                key={thread.id}
                className={`rounded-xl border transition ${
                  isActive
                    ? 'border-brand-200 bg-brand-50 text-brand-800'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                {isEditing && !collapsed ? (
                  <div className="space-y-2 p-2">
                    <input
                      value={editingThreadTitle}
                      onChange={(event) => onRenameTitleChange(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          event.preventDefault()
                          onRenameSubmit(thread.id)
                        }
                        if (event.key === 'Escape') {
                          onCancelRename()
                        }
                      }}
                      className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-brand-500"
                      autoFocus
                    />
                    <div className="flex justify-end gap-1">
                      <button
                        type="button"
                        onClick={onCancelRename}
                        className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 hover:bg-slate-100"
                        title="Hủy"
                      >
                        <X className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onRenameSubmit(thread.id)}
                        disabled={isMutating || !editingThreadTitle.trim()}
                        className="grid h-8 w-8 place-items-center rounded-lg bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-50"
                        title="Lưu tên"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className={`flex items-stretch gap-2 p-2 ${collapsed ? 'justify-center' : ''}`}>
                    <button
                      type="button"
                      onClick={() => onSelect(thread.id)}
                      className={`min-w-0 flex-1 text-left ${collapsed ? 'hidden' : ''}`}
                    >
                      <div className="line-clamp-2 text-sm font-medium">{thread.title}</div>
                      <div className="mt-1 flex items-center gap-1 text-[11px] text-slate-500">
                        <ShieldCheck className="h-3 w-3" />
                        {thread._count?.messages ?? 0} tin nhắn · {threadTime(thread.updatedAt)}
                      </div>
                    </button>
                    {collapsed ? (
                      <button
                        type="button"
                        onClick={() => onSelect(thread.id)}
                        className="grid h-10 w-10 place-items-center rounded-xl text-brand-700 hover:bg-brand-100"
                        title={thread.title}
                      >
                        <MessageSquarePlus className="h-4 w-4" />
                      </button>
                    ) : (
                      <div className="flex shrink-0 flex-col gap-1">
                        <button
                          type="button"
                          onClick={() => onStartRename(thread)}
                          className="grid h-7 w-7 place-items-center rounded-lg text-slate-500 hover:bg-white"
                          title="Đổi tên"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDelete(thread)}
                          className="grid h-7 w-7 place-items-center rounded-lg text-red-500 hover:bg-red-50"
                          title="Xóa"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </aside>
  )
}
