import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { AiChatBox } from './AiChatBox'
import type { AiMessage } from '../api/aiApi'

function createAssistantMessage(id: string, content: string): AiMessage {
  return {
    id,
    threadId: 'thread-1',
    projectId: 'project-1',
    userId: null,
    role: 'ASSISTANT',
    content,
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
}

describe('AiChatBox table overflow scope', () => {
  it('chỉ cho kéo ngang trong khối bảng của tin nhắn có bảng', () => {
    const tableMessage = createAssistantMessage(
      'assistant-table',
      [
        '| STT | Tên công việc | Hạn chót | Người phụ trách | Mức độ ảnh hưởng | Ghi chú xử lý |',
        '| :--- | :--- | :--- | :--- | :--- | :--- |',
        '| 1 | **Kiểm tra kích thước và cao độ hiện trường** | **2026-02-11** | Nguyễn Mạnh Cường | Rất cao | Cần cập nhật trạng thái thực tế |',
      ].join('\n'),
    )
    const normalMessage = createAssistantMessage('assistant-normal', 'Tin nhắn thường không có bảng.')

    const { container } = render(
      <AiChatBox
        messages={[tableMessage, normalMessage]}
        quickPrompts={[]}
        canDraft
        isLoadingMessages={false}
        isSending={false}
        isCancelling={false}
        onSend={vi.fn()}
        onStop={vi.fn()}
        onCopy={vi.fn()}
        onEditMessage={vi.fn()}
        onRetryMessage={vi.fn()}
      />,
    )

    const table = screen.getByRole('table')
    const tableScroll = table.closest('div')
    const horizontalScrollBlocks = container.querySelectorAll('.overflow-x-auto')
    const normalMessageArticle = screen.getByText('Tin nhắn thường không có bảng.').closest('article')

    expect(tableScroll?.getAttribute('class')).toContain('overflow-x-auto')
    expect(tableScroll?.getAttribute('class')).toContain('overscroll-x-contain')
    expect(table.getAttribute('class')).toContain('table-fixed')
    expect(table.getAttribute('class')).toContain('w-full')
    expect(table.getAttribute('class')).not.toContain('min-w-')
    expect(table.getAttribute('class')).not.toContain('w-max')
    expect(screen.getByRole('columnheader', { name: 'Mức độ ảnh hưởng' }).getAttribute('class')).toContain(
      'whitespace-normal',
    )
    screen.getAllByRole('columnheader').forEach((header) => {
      expect(header.getAttribute('class')).toContain('align-top')
      expect(header.getAttribute('class')).not.toContain('align-bottom')
    })
    screen.getAllByRole('cell').forEach((cell) => {
      expect(cell.getAttribute('class')).toContain('align-top')
    })
    expect(horizontalScrollBlocks.length).toBe(1)
    expect(horizontalScrollBlocks[0].contains(table)).toBe(true)
    expect(normalMessageArticle?.querySelector('.overflow-x-auto')).toBeNull()
    expect(screen.getByTestId('ai-message-list').getAttribute('class')).toContain('overflow-x-hidden')
  })

  it('chia cột theo nhóm nội dung chung để bảng bất kỳ không bị lệch khoảng trắng', () => {
    const tableMessage = createAssistantMessage(
      'assistant-risk-table',
      [
        '| Hạng mục/Công việc | Hạn chót/Trạng thái | Rủi ro tiềm ẩn | Mức độ | Đề xuất xử lý |',
        '| :--- | :--- | :--- | :--- | :--- |',
        '| Kiểm tra kích thước & cao độ | 11/02/2026 (Quá hạn) | Sai lệch hiện trạng, dừng thi công | Rất Cao | Hoàn thành và cập nhật kết quả ngay |',
      ].join('\n'),
    )

    const { container } = render(
      <AiChatBox
        messages={[tableMessage]}
        quickPrompts={[]}
        canDraft
        isLoadingMessages={false}
        isSending={false}
        isCancelling={false}
        onSend={vi.fn()}
        onStop={vi.fn()}
        onCopy={vi.fn()}
        onEditMessage={vi.fn()}
        onRetryMessage={vi.fn()}
      />,
    )

    const table = screen.getByRole('table')
    const columns = Array.from(container.querySelectorAll('col'))
    const severityColumn = columns[3] as HTMLTableColElement
    const proposalColumn = columns[4] as HTMLTableColElement
    const severityWidth = Number.parseFloat(severityColumn.style.width)
    const proposalWidth = Number.parseFloat(proposalColumn.style.width)

    expect(table.getAttribute('class')).toContain('table-fixed')
    expect(table.getAttribute('class')).toContain('w-full')
    expect(columns).toHaveLength(5)
    expect(severityWidth).toBeLessThan(proposalWidth)
    expect(severityWidth).toBeLessThanOrEqual(13)
    expect(proposalWidth).toBeGreaterThanOrEqual(24)
    expect(screen.getByRole('columnheader', { name: 'Đề xuất xử lý' }).getAttribute('class')).toContain('break-words')
  })

  it('auto-fit bảng ít cột vào khung chat mà vẫn chia cột theo nội dung', () => {
    const tableMessage = createAssistantMessage(
      'assistant-summary-table',
      [
        '| Hạng mục | Thông tin chi tiết | Trạng thái / Lưu ý |',
        '| :--- | :--- | :--- |',
        '| Tiến độ tổng thể | Đạt **47.25%** | Theo kế hoạch đến 15/10/2026 |',
        '| Công việc nổi bật | 04 công việc trọng điểm đang triển khai | Toàn bộ đều **quá hạn** |',
      ].join('\n'),
    )

    render(
      <AiChatBox
        messages={[tableMessage]}
        quickPrompts={[]}
        canDraft
        isLoadingMessages={false}
        isSending={false}
        isCancelling={false}
        onSend={vi.fn()}
        onStop={vi.fn()}
        onCopy={vi.fn()}
        onEditMessage={vi.fn()}
        onRetryMessage={vi.fn()}
      />,
    )

    const table = screen.getByRole('table')
    const headers = screen.getAllByRole('columnheader')

    expect(table.getAttribute('class')).toContain('table-fixed')
    expect(table.getAttribute('class')).toContain('w-full')
    expect(table.getAttribute('class')).not.toContain('min-w-')
    expect(table.style.width).toBe('')
    expect(screen.getByRole('columnheader', { name: 'Thông tin chi tiết' }).closest('table')).toBe(table)
    expect(headers.map((header) => header.textContent)).toEqual([
      'Hạng mục',
      'Thông tin chi tiết',
      'Trạng thái / Lưu ý',
    ])
    expect(Number.parseFloat((table.querySelectorAll('col')[1] as HTMLTableColElement).style.width)).toBeGreaterThan(
      Number.parseFloat((table.querySelectorAll('col')[0] as HTMLTableColElement).style.width),
    )
    headers.forEach((header) => {
      expect(header.getAttribute('class')).toContain('align-top')
    })
  })

  it('áp dụng cùng quy tắc căn chỉnh và độ rộng cho các bảng không phải rủi ro', () => {
    const tableMessage = createAssistantMessage(
      'assistant-generic-table',
      [
        '| Hạng mục | Trạng thái | Nội dung cập nhật | Ghi chú |',
        '| :--- | :--- | :--- | :--- |',
        '| Hồ sơ nghiệm thu | Đang xử lý | Bổ sung biên bản nghiệm thu nội bộ và chữ ký xác nhận | Ưu tiên trong hôm nay |',
      ].join('\n'),
    )

    const { container } = render(
      <AiChatBox
        messages={[tableMessage]}
        quickPrompts={[]}
        canDraft
        isLoadingMessages={false}
        isSending={false}
        isCancelling={false}
        onSend={vi.fn()}
        onStop={vi.fn()}
        onCopy={vi.fn()}
        onEditMessage={vi.fn()}
        onRetryMessage={vi.fn()}
      />,
    )

    const columns = Array.from(container.querySelectorAll('col'))
    const statusColumn = columns[1] as HTMLTableColElement
    const contentColumn = columns[2] as HTMLTableColElement
    const noteColumn = columns[3] as HTMLTableColElement

    expect(screen.getByRole('table').getAttribute('class')).toContain('table-fixed')
    expect(screen.getByRole('table').getAttribute('class')).toContain('w-full')
    expect(columns).toHaveLength(4)
    expect(Number.parseFloat(statusColumn.style.width)).toBeLessThan(Number.parseFloat(contentColumn.style.width))
    expect(Number.parseFloat(statusColumn.style.width)).toBeLessThan(Number.parseFloat(noteColumn.style.width))
    screen.getAllByRole('columnheader').forEach((header) => {
      expect(header.getAttribute('class')).toContain('align-top')
    })
  })

  it('gom trùng nguồn dữ liệu trước khi render để không sinh key trùng', () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const message = {
      ...createAssistantMessage('assistant-sources', 'Đã tổng hợp dữ liệu.'),
      contextSources: [
        { toolId: 'PROJECT' as const, recordType: 'Dự án', recordId: 'project-1', title: 'Dự án A' },
        { toolId: 'PROJECT' as const, recordType: 'Dự án', recordId: 'project-1', title: 'Dự án A' },
        { toolId: 'TASK' as const, recordType: 'Công việc', recordId: 'task-1', title: 'Kiểm tra cao độ' },
        { toolId: 'TASK' as const, recordType: 'Công việc', recordId: 'task-1', title: 'Kiểm tra cao độ' },
      ],
    }

    try {
      render(
        <AiChatBox
          messages={[message]}
          quickPrompts={[]}
          canDraft
          isLoadingMessages={false}
          isSending={false}
          isCancelling={false}
          onSend={vi.fn()}
          onStop={vi.fn()}
          onCopy={vi.fn()}
          onEditMessage={vi.fn()}
          onRetryMessage={vi.fn()}
        />,
      )

      const consoleErrors = consoleErrorSpy.mock.calls.map((call) => String(call[0])).join('\n')
      expect(consoleErrors).not.toContain('same key')
      expect(screen.getAllByText(/Dự án A/u)).toHaveLength(1)
      expect(screen.getAllByText(/Kiểm tra cao độ/u)).toHaveLength(1)
    } finally {
      consoleErrorSpy.mockRestore()
    }
  })
})
