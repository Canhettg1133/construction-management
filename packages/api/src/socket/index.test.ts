import { describe, expect, it } from 'vitest'
import type { Socket } from 'socket.io'
import { getCookieValue, getSocketAccessToken } from './index'

function socketWithHandshake(handshake: Partial<Socket['handshake']>) {
  return { handshake } as Socket
}

describe('Socket auth helpers', () => {
  it('reads access_token from a cookie header', () => {
    expect(getCookieValue('theme=dark; access_token=abc%20123; other=value', 'access_token')).toBe('abc 123')
  })

  it('prefers explicit auth token when present', () => {
    const socket = socketWithHandshake({
      auth: { token: 'from-auth' },
      headers: { cookie: 'access_token=from-cookie' },
    })

    expect(getSocketAccessToken(socket)).toBe('from-auth')
  })

  it('falls back to httpOnly cookie for browser clients', () => {
    const socket = socketWithHandshake({
      auth: {},
      headers: { cookie: 'access_token=from-cookie' },
    })

    expect(getSocketAccessToken(socket)).toBe('from-cookie')
  })
})
