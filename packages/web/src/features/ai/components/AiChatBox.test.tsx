import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { AiChatBox } from './AiChatBox'
import type { AiMessage } from '../api/aiApi'

const assistantMessage: AiMessage = {
  id: 'assistant-1',
  threadId: 'thread-1',
  projectId: 'project-1',
  userId: null,
  role: 'ASSISTANT',
  content: ['### **Kết luận**', '- **Tiến độ:** 47.25%', '- **Dữ liệu còn thiếu:** máy móc, nhân lực hôm nay'].join(
    '\n',
  ),
  provider: 'MOCK',
  model: 'mock-construction-assistant',
  latencyMs: 12,
  contextSources: [],
  errorCode: null,
  createdAt: '2026-05-14T00:00:00.000Z',
  updatedAt: '2026-05-14T00:00:00.000Z',
  editedAt: null,
  deletedAt: null,
}

const secondAssistantMessage: AiMessage = {
  ...assistantMessage,
  id: 'assistant-2',
  content: '**Thông tin mới:** đã cập nhật thêm dữ liệu.',
  createdAt: '2026-05-14T00:01:00.000Z',
}

const pendingAssistantMessage: AiMessage = {
  ...secondAssistantMessage,
  id: 'pending-assistant-run-1',
  content: '**Kết quả:** AI đã trả lời xong nội dung này.',
  clientStatus: 'pending',
}

const savedAssistantMessage: AiMessage = {
  ...pendingAssistantMessage,
  id: 'assistant-saved-1',
  clientStatus: undefined,
}

const streamingAssistantMessage: AiMessage = {
  ...secondAssistantMessage,
  id: 'pending-assistant-stream-1',
  content: 'AI đang trả lời',
  clientStatus: 'pending',
}

const expandedStreamingAssistantMessage: AiMessage = {
  ...streamingAssistantMessage,
  content: ['AI đang trả lời', 'Nội dung được stream thêm từng đoạn nhưng khung chat phải đứng yên.'].join('\n'),
}

function createProps(messages: AiMessage[]) {
  return {
    messages,
    quickPrompts: [],
    canDraft: true,
    isLoadingMessages: false,
    isSending: false,
    isCancelling: false,
    onSend: vi.fn(),
    onStop: vi.fn(),
    onCopy: vi.fn(),
    onEditMessage: vi.fn(),
    onRetryMessage: vi.fn(),
  }
}

function renderChat(messages: AiMessage[] = [assistantMessage]) {
  const view = render(<AiChatBox {...createProps(messages)} />)
  return {
    ...view,
    rerenderChat: (nextMessages: AiMessage[]) => view.rerender(<AiChatBox {...createProps(nextMessages)} />),
  }
}

function mockScrollMetrics(
  element: HTMLElement,
  values: { scrollTop: number; scrollHeight: number; clientHeight: number },
) {
  Object.defineProperty(element, 'scrollTop', { configurable: true, writable: true, value: values.scrollTop })
  Object.defineProperty(element, 'scrollHeight', { configurable: true, value: values.scrollHeight })
  Object.defineProperty(element, 'clientHeight', { configurable: true, value: values.clientHeight })
}

describe('AiChatBox', () => {
  it('render Markdown cơ bản để phản hồi AI dễ đọc và có in đậm', () => {
    renderChat()

    const headingText = screen.getByText('Kết luận')
    expect(headingText.tagName).toBe('STRONG')
    expect(headingText.closest('h3')).toBeTruthy()

    const progressLabel = screen.getByText('Tiến độ:')
    expect(progressLabel.tagName).toBe('STRONG')
    expect(progressLabel.closest('li')).toBeTruthy()

    expect(screen.getByText('Dữ liệu còn thiếu:').tagName).toBe('STRONG')
    expect(screen.getByText(/máy móc, nhân lực hôm nay/u)).toBeTruthy()
  })

  it('render bảng Markdown thành bảng thật thay vì hiện dấu gạch đứng', () => {
    const { container } = renderChat([
      {
        ...assistantMessage,
        content: [
          '| STT | Tên công việc | Hạn chót |',
          '| :--- | :--- | :--- |',
          '| 1 | **Kiểm tra cao độ** | **2026-02-11** |',
        ].join('\n'),
      },
    ])

    expect(screen.getByRole('table')).toBeTruthy()
    expect(screen.getByRole('table').closest('div')?.getAttribute('class')).toContain('overflow-x-auto')
    expect(container.querySelectorAll('.overflow-x-auto').length).toBe(1)
    expect(screen.getByTestId('ai-message-list').getAttribute('class')).toContain('overflow-x-hidden')
    expect(screen.getByRole('columnheader', { name: 'Tên công việc' })).toBeTruthy()
    expect(screen.getByText('Kiểm tra cao độ').tagName).toBe('STRONG')
  })

  it('không tự kéo xuống cuối khi người dùng đang cuộn lên đọc', async () => {
    const { rerenderChat } = renderChat()
    const list = screen.getByTestId('ai-message-list')
    mockScrollMetrics(list, { scrollTop: 0, scrollHeight: 1000, clientHeight: 300 })

    fireEvent.scroll(list)
    rerenderChat([assistantMessage, secondAssistantMessage])

    await waitFor(() => {
      expect(list.scrollTop).toBe(0)
      expect(screen.getByRole('button', { name: 'Xuống cuối' })).toBeTruthy()
    })
  })

  it('bám cuối mượt khi người dùng đang ở cuối đoạn chat', async () => {
    const { rerenderChat } = renderChat()
    const list = screen.getByTestId('ai-message-list')
    mockScrollMetrics(list, { scrollTop: 690, scrollHeight: 1000, clientHeight: 300 })

    fireEvent.scroll(list)
    mockScrollMetrics(list, { scrollTop: 690, scrollHeight: 1200, clientHeight: 300 })
    rerenderChat([assistantMessage, secondAssistantMessage])

    await waitFor(() => {
      expect(list.scrollTop).toBe(1200)
    })
    expect(screen.queryByRole('button', { name: 'Xuống cuối' })).toBeNull()
  })

  it('không bám xuống theo từng token khi nội dung AI đang stream dài ra', async () => {
    const { rerenderChat } = renderChat([assistantMessage, streamingAssistantMessage])
    const list = screen.getByTestId('ai-message-list')
    mockScrollMetrics(list, { scrollTop: 900, scrollHeight: 1200, clientHeight: 300 })

    mockScrollMetrics(list, { scrollTop: 900, scrollHeight: 1500, clientHeight: 300 })
    rerenderChat([assistantMessage, expandedStreamingAssistantMessage])

    await waitFor(() => {
      expect(list.scrollTop).toBe(900)
      expect(screen.getByRole('button', { name: 'Xuống cuối' })).toBeTruthy()
    })
  })

  it('không kéo xuống lại khi chỉ thay tin nhắn tạm bằng tin nhắn đã lưu cùng nội dung', async () => {
    const { rerenderChat } = renderChat([assistantMessage, pendingAssistantMessage])
    const list = screen.getByTestId('ai-message-list')
    mockScrollMetrics(list, { scrollTop: 420, scrollHeight: 1200, clientHeight: 300 })

    rerenderChat([assistantMessage, savedAssistantMessage])

    await waitFor(() => {
      expect(list.scrollTop).toBe(420)
    })
  })
})
