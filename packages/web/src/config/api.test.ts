import axios, { AxiosError, type AxiosAdapter, type AxiosResponse } from 'axios'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import api from './api'

function unauthorized(config: AxiosResponse['config']) {
  return new AxiosError(
    'Unauthorized',
    'ERR_BAD_REQUEST',
    config,
    {},
    {
      config,
      data: { success: false },
      headers: {},
      status: 401,
      statusText: 'Unauthorized',
    },
  )
}

describe('api 401 refresh interceptor', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    Object.defineProperty(globalThis, 'crypto', {
      value: { randomUUID: () => 'request-id' },
      configurable: true,
    })
  })

  it('refreshes once and retries the original request', async () => {
    let requestCount = 0
    const adapter: AxiosAdapter = vi.fn(async (config) => {
      requestCount += 1
      if (requestCount === 1) {
        throw unauthorized(config)
      }
      return {
        config,
        data: { success: true, data: 'ok' },
        headers: {},
        status: 200,
        statusText: 'OK',
      }
    })
    api.defaults.adapter = adapter
    vi.spyOn(axios, 'post').mockResolvedValue({ status: 200 })

    const response = await api.get('/protected')

    expect(axios.post).toHaveBeenCalledWith(
      '/api/v1/auth/refresh',
      undefined,
      expect.objectContaining({ withCredentials: true }),
    )
    expect(adapter).toHaveBeenCalledTimes(2)
    expect(response.status).toBe(200)
  })

  it('does not refresh failed login requests', async () => {
    api.defaults.adapter = vi.fn(async (config) => {
      throw unauthorized(config)
    })
    const refreshSpy = vi.spyOn(axios, 'post').mockResolvedValue({ status: 200 })

    await expect(api.post('/auth/login', { email: 'a@b.com', password: 'bad' })).rejects.toMatchObject({
      response: { status: 401 },
    })

    expect(refreshSpy).not.toHaveBeenCalled()
  })
})
