import { describe, expect, it } from 'vitest'
import request from 'supertest'

process.env.DATABASE_URL = process.env.DATABASE_URL ?? 'mysql://test:test@localhost:3306/test'
process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'test-jwt-secret-test-jwt-secret-123'
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET ?? 'test-refresh-secret-test-refresh-secret-123'
process.env.NODE_ENV = 'test'

const { default: app } = await import('../../app')

function signToken(role = 'ADMIN') {
  const jwt = require('jsonwebtoken') as typeof import('jsonwebtoken')
  return jwt.sign({ id: 'u-test', email: 'test@example.com', role }, process.env.JWT_SECRET as string, {
    expiresIn: '1h',
  })
}

const PROJECT_ID = '11111111-1111-1111-1111-111111111111'
const FILE_ID = '00000000-0000-0000-0000-000000000001'

describe('Documents - Trash flow', () => {
  it('GET /projects/:projectId/documents requires authentication', async () => {
    const res = await request(app).get(`/api/v1/projects/${PROJECT_ID}/documents`)
    expect(res.status).toBe(401)
  })

  it('GET /documents/trash requires authentication', async () => {
    const res = await request(app).get(`/api/v1/documents/trash`)
    expect(res.status).toBe(401)
  })

  it('DELETE /documents/:id requires ADMIN or PROJECT_MANAGER', async () => {
    const token = signToken('SITE_ENGINEER')
    const res = await request(app)
      .delete(`/api/v1/documents/${FILE_ID}`)
      .set('Cookie', [`access_token=${token}`])

    expect(res.status).toBe(403)
  })

  it('POST /documents/:id/restore requires ADMIN or PROJECT_MANAGER', async () => {
    const token = signToken('SITE_ENGINEER')
    const res = await request(app)
      .post(`/api/v1/documents/${FILE_ID}/restore`)
      .set('Cookie', [`access_token=${token}`])

    expect(res.status).toBe(403)
  })

  it('DELETE /documents/:id/permanent requires ADMIN', async () => {
    const token = signToken('PROJECT_MANAGER')
    const res = await request(app)
      .delete(`/api/v1/documents/${FILE_ID}/permanent`)
      .set('Cookie', [`access_token=${token}`])

    expect(res.status).toBe(403)
  })
})
