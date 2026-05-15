import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  bcrypt: {
    hash: vi.fn(),
  },
  userRepository: {
    findById: vi.fn(),
    updatePassword: vi.fn(),
  },
  auditService: {
    log: vi.fn(),
  },
}))

vi.mock('@node-rs/bcrypt', () => ({
  default: mocks.bcrypt,
  hash: mocks.bcrypt.hash,
}))

vi.mock('./user.repository', () => ({
  userRepository: mocks.userRepository,
}))

vi.mock('../audit/audit.service', () => ({
  auditService: mocks.auditService,
}))

const { userService } = await import('./user.service')

describe('userService.resetPassword', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.bcrypt.hash.mockResolvedValue('hashed-new-password')
    mocks.userRepository.updatePassword.mockResolvedValue({})
    mocks.auditService.log.mockResolvedValue(undefined)
  })

  it('hashes the new password, updates the user, and records an audit log (AC-1.2)', async () => {
    mocks.userRepository.findById.mockResolvedValue({
      id: 'user-1',
      name: 'Test User',
      email: 'user@example.com',
      systemRole: 'STAFF',
      isActive: true,
    })

    const result = await userService.resetPassword('user-1', 'NewPass123', 'admin-1')

    expect(result).toEqual({ email: 'user@example.com' })
    expect(mocks.bcrypt.hash).toHaveBeenCalledWith('NewPass123', 12)
    expect(mocks.userRepository.updatePassword).toHaveBeenCalledWith('user-1', 'hashed-new-password')
    expect(mocks.auditService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'admin-1',
        action: 'PASSWORD_RESET',
        entityType: 'USER',
        entityId: 'user-1',
        description: expect.stringContaining('user@example.com'),
      }),
    )
  })

  it('rejects password resets for unknown users', async () => {
    mocks.userRepository.findById.mockResolvedValue(null)

    await expect(userService.resetPassword('missing-user', 'NewPass123', 'admin-1')).rejects.toMatchObject({
      statusCode: 404,
      code: 'NOT_FOUND',
    })

    expect(mocks.userRepository.updatePassword).not.toHaveBeenCalled()
    expect(mocks.auditService.log).not.toHaveBeenCalled()
  })
})
