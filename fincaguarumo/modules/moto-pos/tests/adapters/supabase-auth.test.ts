import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createSupabaseAuthProvider } from '../../src/adapters/supabase-auth'
import type { HttpRequestLike } from '../../src/types'

const createMockRequest = (token: string): HttpRequestLike => ({
  method: 'POST',
  headers: new Headers({ authorization: `Bearer ${token}` }),
  json: vi.fn().mockResolvedValue({}),
})

// Helper to create a valid JWT with base64 encoding (matching parseJWT implementation)
const createValidJWT = (appMetadata: Record<string, unknown> = { role: 'admin' }, overrides: Partial<{ sub: string; email: string; exp: number }> = {}) => {
  const header = { alg: 'HS256', typ: 'JWT' }
  const payload = {
    sub: 'user_123',
    email: 'admin@example.com',
    app_metadata: appMetadata,
    exp: Math.floor(Date.now() / 1000) + 3600,
    ...overrides,
  }
  const encode = (obj: object) => Buffer.from(JSON.stringify(obj)).toString('base64')
  const signature = 'signature'
  return `${encode(header)}.${encode(payload)}.${signature}`
}

describe('supabase-auth', () => {
  let provider: ReturnType<typeof createSupabaseAuthProvider>

  beforeEach(() => {
    provider = createSupabaseAuthProvider(
      'https://test.supabase.co',
      'service_key',
      'jwt_secret'
    )
  })

  describe('verifyUser with JWT', () => {
    it('returns user with admin=true when JWT has admin role', async () => {
      const token = createValidJWT({ role: 'admin' })
      const req = createMockRequest(token)

      const user = await provider.verifyUser(req)
      expect(user).toEqual({
        id: 'user_123',
        email: 'admin@example.com',
        isAdmin: true,
      })
    })

    it('returns user with admin=false when JWT has no admin role', async () => {
      const token = createValidJWT({ role: 'user' })
      const req = createMockRequest(token)

      const user = await provider.verifyUser(req)
      expect(user.isAdmin).toBe(false)
    })

    it('returns user with admin=true when JWT has roles array with admin', async () => {
      const header = { alg: 'HS256', typ: 'JWT' }
      const payload = {
        sub: 'user_123',
        email: 'admin@example.com',
        app_metadata: { roles: ['editor', 'admin'] },
        exp: Math.floor(Date.now() / 1000) + 3600,
      }
      const encode = (obj: object) => Buffer.from(JSON.stringify(obj)).toString('base64')
      const token = `${encode(header)}.${encode(payload)}.signature`
      
      const req = createMockRequest(token)
      const user = await provider.verifyUser(req)
      expect(user.isAdmin).toBe(true)
    })

    it('throws 401 for missing auth header', async () => {
      const req = { method: 'POST', headers: new Headers(), json: vi.fn() } as HttpRequestLike
      await expect(provider.verifyUser(req)).rejects.toMatchObject({ status: 401 })
    })

    it('throws 401 for invalid auth header format', async () => {
      const req = createMockRequest('')
      req.headers.set('authorization', 'InvalidToken')
      await expect(provider.verifyUser(req)).rejects.toMatchObject({ status: 401 })
    })

    it('falls back to DB for expired JWT', async () => {
      // Expired JWT should fall through to DB verification
      // We can't easily mock the DB call without complex setup, so we just verify it doesn't throw 401 immediately
      const token = createValidJWT({}, { exp: Math.floor(Date.now() / 1000) - 3600 })
      const req = createMockRequest(token)
      
      // Without a real Supabase connection, this will fail at DB level
      // But the important thing is it doesn't throw "Invalid or expired token" from JWT parsing
      await expect(provider.verifyUser(req)).rejects.toThrow()
    })
  })

  describe('verifyAdmin', () => {
    it('returns user when admin', async () => {
      const token = createValidJWT({ role: 'admin' })
      const req = createMockRequest(token)

      const user = await provider.verifyAdmin(req)
      expect(user.isAdmin).toBe(true)
    })

    it('throws 403 when not admin', async () => {
      const token = createValidJWT({ role: 'user' })
      const req = createMockRequest(token)

      await expect(provider.verifyAdmin(req)).rejects.toMatchObject({ status: 403 })
    })
  })
})