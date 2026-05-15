import { useEffect, useLayoutEffect, useRef, useState, type ComponentType, type ReactNode } from 'react'
import {
  AlertTriangle,
  Bot,
  CalendarDays,
  ChevronDown,
  Copy,
  FileText,
  Loader2,
  PackageSearch,
  Pencil,
  RotateCcw,
  Send,
  ShieldCheck,
  Square,
  TrendingUp,
  UserRound,
  X,
} from 'lucide-react'
import { TOOL_LABELS } from '@construction/shared'
import type { AiContextSource, AiMessage, AiMessageIntent, AiQuickPromptPreset } from '../api/aiApi'

const COMPOSER_MIN_HEIGHT = 44
const COMPOSER_MAX_HEIGHT = 180
const AUTO_SCROLL_BOTTOM_THRESHOLD = 96
const MAX_VISIBLE_CONTEXT_SOURCES = 8

const QUICK_PROMPT_ICONS: Record<AiQuickPromptPreset, ComponentType<{ className?: string }>> = {
  WEEKLY_SUMMARY: CalendarDays,
  OVERDUE_TASKS: AlertTriangle,
  SCHEDULE_RISK: TrendingUp,
  LOW_STOCK_CHECK: PackageSearch,
  SAFETY_QUALITY_SUMMARY: ShieldCheck,
  DAILY_REPORT_DRAFT: FileText,
}

export interface QuickPrompt {
  preset: AiQuickPromptPreset
  label: string
  description: string
  content: string
  intent: AiMessageIntent
  badge?: string
  disabledReason?: string
  requiresDraftPermission?: boolean
}

interface AiChatBoxProps {
  messages: AiMessage[]
  quickPrompts: QuickPrompt[]
  canDraft: boolean
  isLoadingMessages: boolean
  isSending: boolean
  isCancelling: boolean
  onSend: (content: string, intent: AiMessageIntent, quickPromptPreset?: AiQuickPromptPreset) => Promise<void>
  onStop: () => Promise<void>
  onCopy: (content: string) => Promise<void>
  onEditMessage: (messageId: string, content: string) => Promise<void>
  onRetryMessage: (messageId: string) => Promise<void>
}

function messageTime(value: string) {
  return new Date(value).toLocaleString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
  })
}

function useCoarseInput() {
  const [isCoarseInput, setIsCoarseInput] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return
    }
    const media = window.matchMedia('(pointer: coarse), (max-width: 768px)')
    const sync = () => setIsCoarseInput(media.matches)
    sync()
    media.addEventListener('change', sync)
    return () => media.removeEventListener('change', sync)
  }, [])

  return isCoarseInput
}

function resizeTextarea(textarea: HTMLTextAreaElement | null) {
  if (!textarea) {
    return
  }
  textarea.style.height = `${COMPOSER_MIN_HEIGHT}px`
  const nextHeight = Math.min(Math.max(textarea.scrollHeight, COMPOSER_MIN_HEIGHT), COMPOSER_MAX_HEIGHT)
  textarea.style.height = `${nextHeight}px`
  textarea.style.overflowY = nextHeight >= COMPOSER_MAX_HEIGHT ? 'auto' : 'hidden'
}

function runAfterNextPaint(callback: () => void) {
  if (typeof window.requestAnimationFrame === 'function') {
    window.requestAnimationFrame(callback)
    return
  }

  window.setTimeout(callback, 0)
}

function isNearScrollBottom(element: HTMLElement | null) {
  if (!element) {
    return true
  }
  return element.scrollHeight - element.scrollTop - element.clientHeight <= AUTO_SCROLL_BOTTOM_THRESHOLD
}

function renderInlineMarkdown(text: string) {
  const parts: ReactNode[] = []
  const boldPattern = /\*\*(.+?)\*\*/gu
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = boldPattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index))
    }

    parts.push(
      <strong key={`bold-${match.index}`} className="font-semibold text-inherit">
        {match[1]}
      </strong>,
    )
    lastIndex = match.index + match[0].length
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex))
  }

  return parts.length > 0 ? parts : text
}

function renderParagraph(lines: string[], key: string) {
  return (
    <p key={key} className="m-0">
      {lines.map((line, index) => (
        <span key={`${key}-line-${index}`}>
          {index > 0 && <br />}
          {renderInlineMarkdown(line)}
        </span>
      ))}
    </p>
  )
}

function isListLine(line: string) {
  return /^(\s*[-*]\s+|\s*\d+\.\s+)/u.test(line)
}

function stripListMarker(line: string) {
  return line.replace(/^\s*(?:[-*]|\d+\.)\s+/u, '')
}

function isTableLine(line: string) {
  const trimmed = line.trim()
  return trimmed.startsWith('|') && trimmed.endsWith('|') && trimmed.split('|').length >= 4
}

function isTableDividerLine(line: string) {
  return /^\|(?:\s*:?-{3,}:?\s*\|)+\s*$/u.test(line.trim())
}

function splitTableRow(line: string) {
  return line
    .trim()
    .replace(/^\|/u, '')
    .replace(/\|$/u, '')
    .split('|')
    .map((cell) => cell.trim())
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')
}

function normalizeHeaderText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/gu, '')
    .replace(/đ/giu, 'd')
    .toLowerCase()
}

function headerHasAny(header: string, terms: string[]) {
  const normalized = normalizeHeaderText(header)
  return terms.some((term) => {
    const normalizedTerm = normalizeHeaderText(term)
    return new RegExp(`(^|[^\\p{L}\\p{N}])${escapeRegExp(normalizedTerm)}([^\\p{L}\\p{N}]|$)`, 'u').test(normalized)
  })
}

function isOrdinalColumnHeader(header: string, index: number) {
  return index === 0 && /^(stt|#|no\.?|so)$/u.test(normalizeHeaderText(header.trim()))
}

function tableColumnClass(header: string, index: number) {
  if (isOrdinalColumnHeader(header, index)) {
    return 'text-center'
  }

  if (headerHasAny(header, ['mức độ', 'ưu tiên', 'priority', 'severity'])) {
    return 'font-semibold'
  }

  return ''
}

function tableColumnWeight(header: string, index: number) {
  if (isOrdinalColumnHeader(header, index)) {
    return 0.45
  }

  if (headerHasAny(header, ['đề xuất', 'xử lý', 'nội dung', 'chi tiết', 'phương án', 'hành động', 'việc cần làm', 'recommendation', 'action', 'detail', 'summary'])) {
    return 1.75
  }

  if (headerHasAny(header, ['mức độ', 'ưu tiên', 'priority', 'severity'])) {
    return 0.75
  }

  if (headerHasAny(header, ['rủi ro', 'ảnh hưởng', 'ghi chú', 'lưu ý', 'nhận định', 'mô tả', 'kết quả', 'lý do', 'risk', 'impact', 'note', 'description', 'result', 'reason'])) {
    return 1.4
  }

  if (headerHasAny(header, ['ngày', 'hạn', 'deadline', 'date'])) {
    return 1.05
  }

  if (headerHasAny(header, ['trạng thái', 'tình trạng', 'loại', 'nhóm', 'status', 'type', 'category'])) {
    return 0.85
  }

  if (headerHasAny(header, ['người phụ trách', 'phụ trách', 'assignee', 'owner'])) {
    return 1.05
  }

  return 1.1
}

function formatPercent(value: number) {
  const rounded = Number(value.toFixed(2))
  return `${Number.isInteger(rounded) ? rounded : rounded}%`
}

function tableColumnWidths(headerCells: string[]) {
  const weights = headerCells.map(tableColumnWeight)
  const totalWeight = weights.reduce((total, weight) => total + weight, 0) || 1
  return weights.map((weight) => formatPercent((weight / totalWeight) * 100))
}

function renderTable(tableLines: string[], key: string) {
  const rows = tableLines.filter((line) => !isTableDividerLine(line)).map(splitTableRow)
  const [headerCells, ...bodyRows] = rows

  if (!headerCells || bodyRows.length === 0) {
    return renderParagraph(tableLines, key)
  }

  const columnClasses = headerCells.map(tableColumnClass)
  const columnWidths = tableColumnWidths(headerCells)

  return (
    <div
      key={key}
      className="my-1 min-w-0 max-w-full overflow-x-auto overscroll-x-contain rounded-xl border border-slate-200 bg-white shadow-sm"
    >
      <table className="w-full table-fixed border-collapse text-left text-[13px] leading-5">
        <colgroup>
          {columnWidths.map((width, cellIndex) => (
            <col key={`${key}-col-${cellIndex}`} style={{ width }} />
          ))}
        </colgroup>
        <thead className="bg-slate-50 text-[12px] font-semibold text-slate-700">
          <tr>
            {headerCells.map((cell, cellIndex) => (
              <th
                key={`${key}-head-${cellIndex}`}
                className={`whitespace-normal break-words border-b border-slate-200 px-3 py-2.5 align-top ${columnClasses[cellIndex]}`}
              >
                {renderInlineMarkdown(cell)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white">
          {bodyRows.map((row, rowIndex) => (
            <tr key={`${key}-row-${rowIndex}`} className="border-b border-slate-100 align-top last:border-b-0 even:bg-slate-50/45">
              {headerCells.map((_, cellIndex) => (
                <td
                  key={`${key}-cell-${rowIndex}-${cellIndex}`}
                  className={`whitespace-normal break-words px-3 py-2.5 align-top text-slate-700 ${columnClasses[cellIndex]}`}
                >
                  {renderInlineMarkdown(row[cellIndex] ?? '')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function MarkdownMessage({ content }: { content: string }) {
  const lines = content.split(/\r?\n/u)
  const blocks: ReactNode[] = []
  let index = 0

  while (index < lines.length) {
    const line = lines[index].trimEnd()

    if (!line.trim()) {
      index += 1
      continue
    }

    if (/^-{3,}$/u.test(line.trim())) {
      blocks.push(<hr key={`hr-${index}`} className="border-slate-200" />)
      index += 1
      continue
    }

    if (isTableLine(line) && index + 1 < lines.length && isTableDividerLine(lines[index + 1])) {
      const tableLines: string[] = []
      while (index < lines.length && isTableLine(lines[index])) {
        tableLines.push(lines[index].trimEnd())
        index += 1
      }
      blocks.push(renderTable(tableLines, `table-${index}`))
      continue
    }

    const heading = /^(#{1,4})\s+(.+)$/u.exec(line.trim())
    if (heading) {
      blocks.push(
        <h3 key={`heading-${index}`} className="m-0 text-sm font-semibold leading-6 text-slate-950">
          {renderInlineMarkdown(heading[2])}
        </h3>,
      )
      index += 1
      continue
    }

    if (isListLine(line)) {
      const items: string[] = []
      while (index < lines.length && isListLine(lines[index])) {
        items.push(stripListMarker(lines[index].trimEnd()))
        index += 1
      }
      blocks.push(
        <ul key={`list-${index}`} className="m-0 list-disc space-y-1 pl-5">
          {items.map((item, itemIndex) => (
            <li key={`list-${index}-${itemIndex}`}>{renderInlineMarkdown(item)}</li>
          ))}
        </ul>,
      )
      continue
    }

    const paragraphLines = [line]
    index += 1
    while (
      index < lines.length &&
      lines[index].trim() &&
      !/^(#{1,4})\s+/.test(lines[index].trim()) &&
      !/^-{3,}$/u.test(lines[index].trim()) &&
      !isListLine(lines[index])
    ) {
      paragraphLines.push(lines[index].trimEnd())
      index += 1
    }
    blocks.push(renderParagraph(paragraphLines, `paragraph-${index}`))
  }

  return <div className="min-w-0 max-w-full space-y-2">{blocks}</div>
}

function contextSourceKey(source: AiContextSource) {
  return `${source.toolId}:${source.recordType}:${source.recordId}`
}

function uniqueContextSources(sources: AiContextSource[] | null | undefined) {
  const uniqueSources: AiContextSource[] = []
  const seen = new Set<string>()

  for (const source of sources ?? []) {
    const key = contextSourceKey(source)
    if (seen.has(key)) {
      continue
    }
    seen.add(key)
    uniqueSources.push(source)
  }

  return uniqueSources
}

export function AiChatBox({
  messages,
  quickPrompts,
  canDraft,
  isLoadingMessages,
  isSending,
  isCancelling,
  onSend,
  onStop,
  onCopy,
  onEditMessage,
  onRetryMessage,
}: AiChatBoxProps) {
  const [content, setContent] = useState('')
  const [quickOpen, setQuickOpen] = useState(false)
  const [editingMessage, setEditingMessage] = useState<AiMessage | null>(null)
  const [showJumpToBottom, setShowJumpToBottom] = useState(false)
  const bottomRef = useRef<HTMLDivElement | null>(null)
  const scrollContainerRef = useRef<HTMLDivElement | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const isComposingRef = useRef(false)
  const isAutoFollowingRef = useRef(true)
  const previousMessageCountRef = useRef(0)
  const previousLatestMessageContentRef = useRef('')
  const hasInitialAutoScrolledRef = useRef(false)
  const isCoarseInput = useCoarseInput()
  const hasMessages = messages.length > 0
  const latestMessage = messages[messages.length - 1]
  const latestMessageContent = latestMessage?.content ?? ''

  const scrollToBottom = (behavior: ScrollBehavior = 'auto') => {
    const container = scrollContainerRef.current
    if (!container) {
      return
    }

    if (typeof container.scrollTo === 'function') {
      container.scrollTo({ top: container.scrollHeight, behavior })
    } else {
      container.scrollTop = container.scrollHeight
    }
  }

  useEffect(() => {
    const previousMessageCount = previousMessageCountRef.current
    const previousLatestMessageContent = previousLatestMessageContentRef.current
    const messageCountIncreased = messages.length > previousMessageCount
    const messageCountChanged = messages.length !== previousMessageCount
    const latestMessageContentChanged = latestMessageContent !== previousLatestMessageContent
    const isInitialMessageRender = !hasInitialAutoScrolledRef.current

    previousMessageCountRef.current = messages.length
    previousLatestMessageContentRef.current = latestMessageContent

    if (messages.length === 0) {
      hasInitialAutoScrolledRef.current = false
      setShowJumpToBottom(false)
      return
    }

    hasInitialAutoScrolledRef.current = true

    if (isInitialMessageRender || messageCountIncreased) {
      if (isAutoFollowingRef.current) {
        scrollToBottom(!isInitialMessageRender && messageCountIncreased ? 'smooth' : 'auto')
        setShowJumpToBottom(false)
      } else {
        setShowJumpToBottom(true)
      }
      return
    }

    if (!messageCountChanged && latestMessageContentChanged && latestMessage?.role === 'ASSISTANT') {
      isAutoFollowingRef.current = false
      setShowJumpToBottom(!isNearScrollBottom(scrollContainerRef.current))
    }
  }, [messages.length, latestMessage?.id, latestMessage?.role, latestMessageContent, isSending])

  useEffect(() => {
    if (messages.length > 0) {
      setQuickOpen(false)
    }
  }, [messages.length])

  useLayoutEffect(() => {
    resizeTextarea(textareaRef.current)
  }, [content, editingMessage?.id])

  const resetComposer = () => {
    setContent('')
    setEditingMessage(null)
    runAfterNextPaint(() => resizeTextarea(textareaRef.current))
  }

  const enableAutoFollow = () => {
    isAutoFollowingRef.current = true
    setShowJumpToBottom(false)
    runAfterNextPaint(() => scrollToBottom('smooth'))
  }

  const handleScroll = () => {
    const nearBottom = isNearScrollBottom(scrollContainerRef.current)
    isAutoFollowingRef.current = nearBottom
    setShowJumpToBottom(!nearBottom)
  }

  const submit = async () => {
    const trimmed = content.trim()
    if (!trimmed || isSending) {
      return
    }

    if (editingMessage) {
      enableAutoFollow()
      resetComposer()
      await onEditMessage(editingMessage.id, trimmed)
      return
    }

    enableAutoFollow()
    resetComposer()
    await onSend(trimmed, 'CHAT')
  }

  const handleQuickPrompt = async (prompt: QuickPrompt) => {
    if (prompt.disabledReason || (prompt.requiresDraftPermission && !canDraft)) {
      return
    }
    setQuickOpen(false)
    enableAutoFollow()
    await onSend(prompt.content, prompt.intent, prompt.preset)
  }

  const startEdit = (message: AiMessage) => {
    if (isSending || message.role !== 'USER') {
      return
    }
    setEditingMessage(message)
    setContent(message.content)
    runAfterNextPaint(() => textareaRef.current?.focus())
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-slate-50/60">
      {hasMessages && (
        <div className="relative shrink-0 border-b border-slate-200 bg-white px-3 py-1.5">
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setQuickOpen((value) => !value)}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-sm font-semibold text-slate-700 transition hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-100"
            >
              Gợi ý nhanh
              <ChevronDown className={`h-4 w-4 transition ${quickOpen ? 'rotate-180' : ''}`} />
            </button>
            <div className="hidden text-[11px] text-slate-500 sm:block">Dựa trên dữ liệu bạn có quyền xem.</div>
          </div>

          {quickOpen && (
            <>
              <div className="absolute left-3 right-3 top-[calc(100%-0.25rem)] z-30 hidden rounded-xl border border-slate-200 bg-white p-3 shadow-xl sm:block">
                <QuickPromptGrid
                  prompts={quickPrompts}
                  canDraft={canDraft}
                  isSending={isSending}
                  compact
                  onSelect={handleQuickPrompt}
                />
              </div>
              <div className="fixed inset-0 z-[70] bg-slate-900/40 sm:hidden" onClick={() => setQuickOpen(false)}>
                <div
                  className="absolute inset-x-0 bottom-0 max-h-[82vh] overflow-y-auto rounded-t-3xl bg-white p-4 shadow-2xl"
                  onClick={(event) => event.stopPropagation()}
                >
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                      <h3 className="text-base font-semibold text-slate-950">Gợi ý nhanh</h3>
                      <p className="text-xs text-slate-500">Dựa trên dữ liệu bạn có quyền xem.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setQuickOpen(false)}
                      className="grid h-9 w-9 place-items-center rounded-xl text-slate-500 hover:bg-slate-100"
                      title="Đóng"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <QuickPromptGrid
                    prompts={quickPrompts}
                    canDraft={canDraft}
                    isSending={isSending}
                    onSelect={handleQuickPrompt}
                  />
                </div>
              </div>
            </>
          )}
        </div>
      )}

      <div className="relative min-h-0 flex-1">
        <div
          ref={scrollContainerRef}
          data-testid="ai-message-list"
          onScroll={handleScroll}
          className="h-full min-h-0 space-y-4 overflow-x-hidden overflow-y-auto px-4 py-4"
        >
          {isLoadingMessages && messages.length === 0 ? (
            <div className="flex h-full items-center justify-center text-sm text-slate-500">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Đang tải cuộc trò chuyện...
            </div>
          ) : messages.length === 0 ? (
            <div className="mx-auto flex h-full min-h-[34rem] w-full max-w-5xl flex-col justify-center gap-5">
              <div className="text-center">
                <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-brand-50 text-brand-700 ring-1 ring-brand-100">
                  <Bot className="h-5 w-5" />
                </div>
                <h2 className="mt-3 text-lg font-semibold text-slate-950">Bạn muốn kiểm tra gì trong dự án?</h2>
                <p className="mx-auto mt-1 max-w-2xl text-sm leading-6 text-slate-500">
                  Chọn một gợi ý nhanh bên dưới. AI chỉ dùng dữ liệu máy chủ đã lọc theo quyền của bạn.
                </p>
              </div>
              <QuickPromptGrid
                prompts={quickPrompts}
                canDraft={canDraft}
                isSending={isSending}
                onSelect={handleQuickPrompt}
              />
            </div>
          ) : (
            messages.map((message) => (
              <MessageItem
                key={message.id}
                message={message}
                isSending={isSending}
                onCopy={onCopy}
                onEdit={startEdit}
                onRetry={onRetryMessage}
              />
            ))
          )}

          {isSending && isCancelling && (
            <div className="flex items-center gap-2 rounded-full bg-white px-3 py-2 text-sm text-slate-500 shadow-sm ring-1 ring-slate-200">
              <Loader2 className="h-4 w-4 animate-spin" />
              Đang dừng phản hồi AI...
            </div>
          )}
          <div ref={bottomRef} className={isSending ? 'h-12' : 'h-1'} />
        </div>

        {showJumpToBottom && (
          <button
            type="button"
            onClick={enableAutoFollow}
            className="absolute bottom-3 right-5 inline-flex h-9 items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 shadow-lg transition hover:border-brand-200 hover:text-brand-700"
            title="Xuống cuối đoạn chat"
          >
            <ChevronDown className="h-3.5 w-3.5" />
            Xuống cuối
          </button>
        )}
      </div>

      <div className="shrink-0 border-t border-slate-200 bg-white p-2">
        {editingMessage && (
          <div className="mb-2 flex items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            <span>Đang sửa tin nhắn cũ. Gửi lại sẽ thay thế các phản hồi phía sau.</span>
            <button
              type="button"
              onClick={resetComposer}
              className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-amber-700 hover:bg-amber-100"
              title="Hủy sửa"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        <form
          onSubmit={(event) => {
            event.preventDefault()
            void submit()
          }}
          className="flex items-end gap-1.5 rounded-xl border border-slate-200 bg-slate-50 p-1.5 focus-within:border-brand-300 focus-within:ring-2 focus-within:ring-brand-100"
        >
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(event) => setContent(event.target.value)}
            maxLength={4000}
            placeholder="Nhập câu hỏi về tiến độ, công việc, báo cáo, kho, an toàn, chất lượng..."
            className="min-h-11 flex-1 resize-none border-0 bg-transparent px-2 py-2 text-sm leading-5 text-slate-900 outline-none placeholder:text-slate-400"
            onCompositionStart={() => {
              isComposingRef.current = true
            }}
            onCompositionEnd={() => {
              isComposingRef.current = false
            }}
            onKeyDown={(event) => {
              if (isComposingRef.current || event.nativeEvent.isComposing || event.keyCode === 229) {
                return
              }
              if (!isCoarseInput && event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault()
                void submit()
              }
            }}
          />

          {isSending ? (
            <button
              type="button"
              onClick={() => void onStop()}
              disabled={isCancelling}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-red-600 text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
              title="Dừng phản hồi AI"
            >
              {isCancelling ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Square className="h-3.5 w-3.5" />}
            </button>
          ) : (
            <button
              type="submit"
              disabled={!content.trim()}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand-600 text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
              title={editingMessage ? 'Gửi lại' : 'Gửi'}
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          )}
        </form>
      </div>
    </div>
  )
}

interface MessageItemProps {
  message: AiMessage
  isSending: boolean
  onCopy: (content: string) => Promise<void>
  onEdit: (message: AiMessage) => void
  onRetry: (messageId: string) => Promise<void>
}

interface QuickPromptGridProps {
  prompts: QuickPrompt[]
  canDraft: boolean
  isSending: boolean
  compact?: boolean
  onSelect: (prompt: QuickPrompt) => Promise<void>
}

function QuickPromptGrid({ prompts, canDraft, isSending, compact = false, onSelect }: QuickPromptGridProps) {
  return (
    <div
      className={`grid gap-2.5 ${compact ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3'}`}
    >
      {prompts.map((prompt) => {
        const Icon = QUICK_PROMPT_ICONS[prompt.preset]
        const disabledReason =
          prompt.disabledReason ??
          (prompt.requiresDraftPermission && !canDraft ? 'Cần quyền STANDARD trên Trợ lý AI để tạo bản nháp.' : null)
        const disabled = isSending || Boolean(disabledReason)

        return (
          <button
            key={prompt.preset}
            type="button"
            onClick={() => void onSelect(prompt)}
            disabled={disabled}
            title={disabledReason ?? prompt.description}
            className={`group flex min-h-24 w-full items-start gap-3 rounded-2xl border bg-white p-3 text-left shadow-sm transition focus:outline-none focus:ring-2 focus:ring-brand-100 ${
              disabled
                ? 'cursor-not-allowed border-slate-200 opacity-55'
                : 'border-slate-200 hover:-translate-y-0.5 hover:border-brand-200 hover:bg-brand-50/40 hover:shadow-md'
            }`}
          >
            <span
              className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${
                disabled ? 'bg-slate-100 text-slate-400' : 'bg-brand-50 text-brand-700 group-hover:bg-white'
              }`}
            >
              <Icon className="h-4 w-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold leading-5 text-slate-950">{prompt.label}</span>
                {prompt.badge && (
                  <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700 ring-1 ring-amber-100">
                    {prompt.badge}
                  </span>
                )}
              </span>
              <span className="mt-1 block text-xs leading-5 text-slate-500">
                {disabledReason ?? prompt.description}
              </span>
            </span>
          </button>
        )
      })}
    </div>
  )
}

function MessageItem({ message, isSending, onCopy, onEdit, onRetry }: MessageItemProps) {
  const isUser = message.role === 'USER'
  const isPending = message.clientStatus === 'pending'
  const canRetry = !isSending && !isPending && (isUser || message.role === 'ASSISTANT')
  const contextSources = uniqueContextSources(message.contextSources)
  const visibleContextSources = contextSources.slice(0, MAX_VISIBLE_CONTEXT_SOURCES)

  return (
    <article className={`flex min-w-0 max-w-full gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && (
        <div className="mt-1 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand-50 text-brand-700">
          <Bot className="h-4 w-4" />
        </div>
      )}

      <div
        className={`group min-w-0 ${isUser ? 'max-w-[min(46rem,86%)] items-end' : 'max-w-[min(58rem,94%)] items-start'}`}
      >
        <div
          className={`min-w-0 max-w-full rounded-2xl px-4 py-3 text-sm shadow-sm ${
            isUser
              ? 'bg-brand-600 text-white'
              : message.errorCode
                ? 'border border-red-200 bg-red-50 text-red-800'
                : 'border border-slate-200 bg-white text-slate-800'
          }`}
        >
          <div className={`flex min-w-0 items-start gap-2 break-words leading-6 ${isUser ? 'whitespace-pre-wrap' : ''}`}>
            {isPending && !isUser && <Loader2 className="mt-1 h-4 w-4 shrink-0 animate-spin text-brand-600" />}
            {isUser ? <span>{message.content}</span> : <MarkdownMessage content={message.content} />}
          </div>

          {!isUser && contextSources.length > 0 && (
            <div className="mt-3 border-t border-slate-200 pt-2">
              <div className="mb-1 flex items-center gap-1 text-xs font-medium text-slate-500">
                <ShieldCheck className="h-3.5 w-3.5" />
                Nguồn dữ liệu đã dùng
              </div>
              <div className="flex flex-wrap gap-1.5">
                {visibleContextSources.map((source) => (
                  <span
                    key={contextSourceKey(source)}
                    className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600"
                  >
                    {TOOL_LABELS[source.toolId]} · {source.title ?? source.recordId}
                  </span>
                ))}
                {contextSources.length > MAX_VISIBLE_CONTEXT_SOURCES && (
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500">
                    +{contextSources.length - MAX_VISIBLE_CONTEXT_SOURCES} nguồn
                  </span>
                )}
              </div>
            </div>
          )}

          <div className={`mt-2 text-[11px] ${isUser ? 'text-brand-100' : 'text-slate-400'}`}>
            {messageTime(message.createdAt)}
            {message.editedAt ? ' · đã sửa' : ''}
            {isPending ? ' · đang xử lý' : ''}
            {message.errorCode ? ` · ${message.errorCode}` : ''}
          </div>
        </div>

        {!isPending && (
          <div
            className={`mt-1 flex gap-1 opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100 ${isUser ? 'justify-end' : 'justify-start'}`}
          >
            <button
              type="button"
              onClick={() => void onCopy(message.content)}
              className="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 bg-white text-slate-500 shadow-sm hover:bg-slate-50"
              title="Sao chép"
            >
              <Copy className="h-3.5 w-3.5" />
            </button>
            {isUser && (
              <button
                type="button"
                onClick={() => onEdit(message)}
                disabled={isSending}
                className="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 bg-white text-slate-500 shadow-sm hover:bg-slate-50 disabled:opacity-50"
                title="Sửa và gửi lại"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
            )}
            {canRetry && (
              <button
                type="button"
                onClick={() => void onRetry(message.id)}
                className="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 bg-white text-slate-500 shadow-sm hover:bg-slate-50"
                title={isUser ? 'Gửi lại từ tin nhắn này' : 'Thử lại câu trả lời'}
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        )}
      </div>

      {isUser && (
        <div className="mt-1 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-slate-100 text-slate-600">
          <UserRound className="h-4 w-4" />
        </div>
      )}
    </article>
  )
}
