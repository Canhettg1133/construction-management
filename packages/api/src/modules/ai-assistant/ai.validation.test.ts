import { describe, expect, it } from 'vitest'
import { sendMessageSchema } from './ai.validation'

describe('sendMessageSchema quickPromptPreset', () => {
  it('chấp nhận preset hỏi đáp với intent CHAT', () => {
    const result = sendMessageSchema.safeParse({
      body: {
        content: 'Tóm tắt tình hình dự án tuần này',
        intent: 'CHAT',
        quickPromptPreset: 'WEEKLY_SUMMARY',
      },
    })

    expect(result.success).toBe(true)
  })

  it('từ chối preset không hợp lệ', () => {
    const result = sendMessageSchema.safeParse({
      body: {
        content: 'Kiểm tra dữ liệu',
        intent: 'CHAT',
        quickPromptPreset: 'EXPORT_ALL_DATA',
      },
    })

    expect(result.success).toBe(false)
  })

  it('không cho preset bản nháp báo cáo ngày chạy với intent CHAT', () => {
    const result = sendMessageSchema.safeParse({
      body: {
        content: 'Gợi ý nội dung báo cáo ngày hôm nay',
        intent: 'CHAT',
        quickPromptPreset: 'DAILY_REPORT_DRAFT',
      },
    })

    expect(result.success).toBe(false)
  })

  it('chấp nhận preset báo cáo ngày khi dùng intent tạo bản nháp báo cáo ngày', () => {
    const result = sendMessageSchema.safeParse({
      body: {
        content: 'Gợi ý nội dung báo cáo ngày hôm nay',
        intent: 'DRAFT_DAILY_REPORT',
        quickPromptPreset: 'DAILY_REPORT_DRAFT',
      },
    })

    expect(result.success).toBe(true)
  })
})
