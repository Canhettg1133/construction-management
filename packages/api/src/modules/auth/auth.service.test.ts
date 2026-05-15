import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  authRepository: {
    findByEmail: vi.fn(),
    createResetToken: vi.fn(),
  },
  mailService: {
    sendPasswordReset: vi.fn(),
  },
}))

vi.mock('./auth.repository', () => ({
  authRepository: mocks.authRepository,
}))

vi.mock('../../shared/services/mail.service', () => ({
  mailService: mocks.mailService,
}))

vi.mock('../../config/env', () => ({
  env: {
    FRONTEND_URL: 'https://app.example',
    JWT_SECRET: 'test-jwt-secret-test-jwt-secret-123',
    JWT_REFRESH_SECRET: 'test-refresh-secret-test-refresh-secret-123',
    JWT_EXPIRES_IN: '1h',
    JWT_REFRESH_EXPIRES_IN: '30d',
    LOG_LEVEL: 'silent',
    NODE_ENV: 'test',
  },
}))

const { authService } = await import('./auth.service')

describe('authService.forgotPassword', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.authRepository.createResetToken.mockResolvedValue({})
    mocks.mailService.sendPasswordReset.mockResolvedValue(undefined)
  })

  it('sends reset links as path params for the frontend router (AC-2.1)', async () => {
    mocks.authRepository.findByEmail.mockResolvedValue({
      id: 'user-1',
      email: 'user@example.com',
    })

    await authService.forgotPassword('USER@example.com')

    expect(mocks.authRepository.findByEmail).toHaveBeenCalledWith('user@example.com')
    expect(mocks.mailService.sendPasswordReset).toHaveBeenCalledTimes(1)
    const [, resetUrl] = mocks.mailService.sendPasswordReset.mock.calls[0]
    expect(resetUrl).toMatch(/^https:\/\/app\.example\/reset-password\/[a-f0-9]{64}$/)
    expect(resetUrl).not.toContain('?token=')
  })

  it('does not leak unknown emails', async () => {
    mocks.authRepository.findByEmail.mockResolvedValue(null)

    await authService.forgotPassword('missing@example.com')

    expect(mocks.authRepository.createResetToken).not.toHaveBeenCalled()
    expect(mocks.mailService.sendPasswordReset).not.toHaveBeenCalled()
  })
})
