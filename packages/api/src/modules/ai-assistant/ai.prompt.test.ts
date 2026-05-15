import { describe, expect, it } from 'vitest'
import { buildAiPrompt } from './ai.prompt'
import type { AiContextPayload } from './ai.context'

const baseContext: AiContextPayload = {
  projectId: 'project-1',
  generatedAt: '2026-05-14T00:00:00.000Z',
  includedTools: ['PROJECT', 'DAILY_REPORT'],
  omittedTools: [],
  sources: [],
  data: {
    project: { id: 'project-1', name: 'Dự án kiểm thử' },
    recentReports: [],
  },
}

describe('buildAiPrompt', () => {
  it('áp dụng quy tắc trình bày và chống ảo giác cho phản hồi chung (AC-7.2)', () => {
    const prompt = buildAiPrompt({
      question: 'Tóm tắt tình hình dự án',
      intent: 'CHAT',
      context: baseContext,
      toolCalls: [],
      toolResults: [],
    })

    expect(prompt.system).toContain('Markdown')
    expect(prompt.system).toContain('in đậm')
    expect(prompt.system).toContain('tối đa 5 cột')
    expect(prompt.system).toContain('Không dùng placeholder')
    expect(prompt.system).toContain('Dữ liệu còn thiếu')
    expect(prompt.system).toContain('Phân biệt dữ liệu có căn cứ và suy luận')
    expect(prompt.system).toContain('quá hạn')
  })

  it('siết định dạng và chống placeholder cho bản nháp báo cáo ngày', () => {
    const prompt = buildAiPrompt({
      question: 'Gợi ý nội dung báo cáo ngày hôm nay',
      intent: 'DRAFT_DAILY_REPORT',
      context: baseContext,
      toolCalls: [],
      toolResults: [],
    })

    expect(prompt.system).toContain('Markdown')
    expect(prompt.system).toContain('in đậm')
    expect(prompt.system).toContain('Không dùng placeholder')
    expect(prompt.system).toContain('Dữ liệu còn thiếu')
    expect(prompt.user).toContain('Bản nháp báo cáo ngày')
    expect(prompt.user).toContain('Nhân lực')
    expect(prompt.user).toContain('An toàn')
  })

  it('bắt buộc giữ định dạng bảng khi người dùng yêu cầu bảng công việc quá hạn (AC-9.1)', () => {
    const prompt = buildAiPrompt({
      question: 'Liệt kê công việc đang quá hạn, kèm hạn chót, người phụ trách và mức độ ảnh hưởng bằng 1 bảng',
      intent: 'CHAT',
      context: { ...baseContext, includedTools: ['PROJECT', 'TASK'] },
      toolCalls: [
        {
          name: 'list_overdue_tasks',
          sourceToolIds: ['TASK'],
          status: 'EXECUTED',
        },
      ],
      toolResults: [
        {
          name: 'list_overdue_tasks',
          sourceToolIds: ['TASK'],
          output: { total: 0, tasks: [] },
          sourceRefs: [],
        },
      ],
    })

    expect(prompt.system).toContain('Nếu người dùng yêu cầu cụ thể định dạng bảng')
    expect(prompt.system).toContain('trừ khi người dùng yêu cầu bảng')
    expect(prompt.user).toContain('Yêu cầu định dạng bắt buộc')
    expect(prompt.user).toContain('Công việc | Hạn chót | Người phụ trách | Mức độ ảnh hưởng')
    expect(prompt.user).toContain(
      'Không có công việc quá hạn | Không áp dụng | Không áp dụng | Không có ảnh hưởng quá hạn ghi nhận',
    )
    expect(prompt.user).toContain('Không thay thế danh sách rỗng')
  })
})
