import { describe, expect, it } from 'vitest'
import { LIMITS } from '@construction/shared'
import { parsePagination } from './pagination'

describe('parsePagination', () => {
  it('accepts camelCase pageSize from the web client (AC-6.2)', () => {
    const result = parsePagination({ page: '2', pageSize: '10' })

    expect(result).toEqual({ page: 2, pageSize: 10, skip: 10 })
  })

  it('keeps backward compatibility with page_size', () => {
    const result = parsePagination({ page: '3', page_size: '5' })

    expect(result).toEqual({ page: 3, pageSize: 5, skip: 10 })
  })

  it('caps oversized pageSize at the shared maximum', () => {
    const result = parsePagination({ pageSize: String(LIMITS.MAX_PAGE_SIZE + 1) })

    expect(result.pageSize).toBe(LIMITS.MAX_PAGE_SIZE)
  })
})
