import { beforeEach, describe, expect, it, vi } from 'vitest'
import request from 'supertest'
import { buildAuthCookie, buildTestUser } from '../../test/request-test-helpers'

process.env.DATABASE_URL = process.env.DATABASE_URL ?? 'mysql://test:test@localhost:3306/test'
process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'test-jwt-secret-test-jwt-secret-123'
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET ?? 'test-refresh-secret-test-refresh-secret-123'
process.env.NODE_ENV = 'test'

vi.mock('./user.service', () => ({
  userService: {
    list: vi.fn().mockResolvedValue({ users: [buildTestUser('ADMIN')], total: 1 }),
    getById: vi.fn().mockResolvedValue(buildTestUser('ADMIN')),
    create: vi.fn(),
    update: vi.fn(),
    toggleStatus: vi.fn(),
    resetPassword: vi.fn().mockResolvedValue({ email: 'staff@construction.local' }),
    updateMe: vi.fn(),
  },
}))

const { default: app } = await import('../../app')
const { userService } = await import('./user.service')

describe('Users - request contract', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('GET /users rejects unauthenticated', async () => {
    const res = await request(app).get('/api/v1/users')
    expect(res.status).toBe(401)
  })

  it('STAFF cannot access user list', async () => {
    const res = await request(app).get('/api/v1/users').set('Cookie', buildAuthCookie('STAFF'))

    expect(res.status).toBe(403)
    expect(res.body.error.code).toBe('FORBIDDEN')
  })

  it('ADMIN can list users', async () => {
    const res = await request(app).get('/api/v1/users').set('Cookie', buildAuthCookie('ADMIN'))

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(Array.isArray(res.body.data)).toBe(true)
    expect(res.body.meta).toBeDefined()
  })

  it('POST /users requires authentication', async () => {
    const res = await request(app)
      .post('/api/v1/users')
      .send({ name: 'Test User', email: 'test@example.com', password: 'TestPass1', systemRole: 'STAFF' })

    expect(res.status).toBe(401)
  })

  it('POST /users validates required fields', async () => {
    const res = await request(app).post('/api/v1/users').set('Cookie', buildAuthCookie('ADMIN')).send({})

    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('VALIDATION_ERROR')
    expect(res.body.error.details).toBeDefined()
  })

  it('POST /users validates email format', async () => {
    const res = await request(app)
      .post('/api/v1/users')
      .set('Cookie', buildAuthCookie('ADMIN'))
      .send({ name: 'Test', email: 'not-an-email', password: 'TestPass1', systemRole: 'STAFF' })

    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('VALIDATION_ERROR')
  })

  it('POST /users validates password complexity', async () => {
    const res = await request(app)
      .post('/api/v1/users')
      .set('Cookie', buildAuthCookie('ADMIN'))
      .send({ name: 'Test', email: 'test@example.com', password: 'weak', systemRole: 'STAFF' })

    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('VALIDATION_ERROR')
  })

  it('PATCH /users/:id requires ADMIN role', async () => {
    const res = await request(app)
      .patch('/api/v1/users/u-test-id')
      .set('Cookie', buildAuthCookie('STAFF'))
      .send({ name: 'New Name' })

    expect(res.status).toBe(403)
  })

  it('PATCH /users/:id/status requires ADMIN role', async () => {
    const res = await request(app)
      .patch('/api/v1/users/u-test-id/status')
      .set('Cookie', buildAuthCookie('STAFF'))
      .send({ isActive: false })

    expect(res.status).toBe(403)
  })

  it('POST /users/:id/reset-password requires ADMIN role', async () => {
    const res = await request(app)
      .post('/api/v1/users/u-test-id/reset-password')
      .set('Cookie', buildAuthCookie('STAFF'))
      .send({ newPassword: 'NewPass123' })

    expect(res.status).toBe(403)
  })

  it('POST /users/:id/reset-password validates password complexity', async () => {
    const res = await request(app)
      .post('/api/v1/users/u-test-id/reset-password')
      .set('Cookie', buildAuthCookie('ADMIN'))
      .send({ newPassword: 'weak' })

    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('VALIDATION_ERROR')
  })

  it('ADMIN can set a new password for a user', async () => {
    const res = await request(app)
      .post('/api/v1/users/u-test-id/reset-password')
      .set('Cookie', buildAuthCookie('ADMIN'))
      .send({ newPassword: 'NewPass123' })

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.data.email).toBe('staff@construction.local')
    expect(userService.resetPassword).toHaveBeenCalledWith('u-test-id', 'NewPass123', 'admin-user')
  })

  it('PATCH /users/:id validates isActive field', async () => {
    const res = await request(app)
      .patch('/api/v1/users/u-test-id/status')
      .set('Cookie', buildAuthCookie('ADMIN'))
      .send({ isActive: 'not-a-boolean' })

    expect(res.status).toBe(400)
  })

  it('GET /users/:id requires ADMIN role', async () => {
    const res = await request(app).get('/api/v1/users/u-test-id').set('Cookie', buildAuthCookie('STAFF'))

    expect(res.status).toBe(403)
  })
})
