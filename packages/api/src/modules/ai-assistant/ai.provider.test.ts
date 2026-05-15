import { describe, expect, it } from 'vitest'

process.env.DATABASE_URL = process.env.DATABASE_URL ?? 'mysql://test:test@localhost:3306/test'
process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'test-jwt-secret-test-jwt-secret-123'
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET ?? 'test-refresh-secret-test-refresh-secret-123'
process.env.NODE_ENV = 'test'

const { callAiProvider, callAiProviderStream } = await import('./ai.provider')

describe('callAiProvider MOCK', () => {
  it('trả phản hồi mô phỏng dễ đọc và không echo JSON context thô', async () => {
    const result = await callAiProvider(
      {
        id: 'env:MOCK',
        name: 'Nhà cung cấp mô phỏng',
        provider: 'MOCK',
        baseUrl: null,
        model: 'mock-construction-assistant',
        apiKey: null,
      },
      {
        system: 'system',
        user: [
          'Ý định: CHAT',
          '',
          'Câu hỏi của người dùng: Tóm tắt dự án tuần này',
          '',
          'Phân hệ đã đưa vào kết quả công cụ/ngữ cảnh: PROJECT, TASK',
          '',
          'Phân hệ bị bỏ qua: []',
          '',
          'Ngữ cảnh có cấu trúc JSON:',
          JSON.stringify({ project: { id: 'project-1', name: 'Dự án kiểm thử' } }, null, 2),
        ].join('\n'),
      },
    )

    expect(result.text).toContain('Phạm vi dữ liệu')
    expect(result.text).toContain('Tóm tắt dự án tuần này')
    expect(result.text).not.toContain('Ngữ cảnh có cấu trúc JSON')
    expect(result.text).not.toContain('"project"')
  })
})

describe('callAiProviderStream', () => {
  it('stream MOCK bằng một delta và trả đủ response', async () => {
    const deltas: string[] = []

    const result = await callAiProviderStream(
      {
        id: 'env:MOCK',
        name: 'Nhà cung cấp mô phỏng',
        provider: 'MOCK',
        baseUrl: null,
        model: 'mock-construction-assistant',
        apiKey: null,
      },
      {
        system: 'system',
        user: [
          'Câu hỏi của người dùng: Kiểm tra stream',
          'Phân hệ đã đưa vào kết quả công cụ/ngữ cảnh: PROJECT',
          'Phân hệ bị bỏ qua: []',
        ].join('\n'),
      },
      {
        onDelta: (text) => {
          deltas.push(text)
        },
      },
    )

    expect(deltas).toHaveLength(1)
    expect(result.text).toBe(deltas.join(''))
    expect(result.provider).toBe('MOCK')
  })
})
