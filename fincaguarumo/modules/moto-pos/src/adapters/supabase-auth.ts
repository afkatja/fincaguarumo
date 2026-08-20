import { createClient } from '@supabase/supabase-js'
import type { AuthProvider, AuthUser, HttpRequestLike } from '../types'

interface JWTPayload {
  sub: string
  email?: string
  app_metadata?: {
    role?: string
    provider?: string
    providers?: string[]
    [key: string]: unknown
  }
  user_metadata?: Record<string, unknown>
  aud?: string
  exp?: number
  iat?: number
}

function parseJWT(token: string): JWTPayload | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3 || !parts[1]) return null
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString())
    return payload as JWTPayload
  } catch {
    return null
  }
}

function extractAdminFromJWT(payload: JWTPayload): boolean {
  const role = payload.app_metadata?.role
  if (role === 'admin') return true
  const roles = payload.app_metadata?.roles
  if (Array.isArray(roles) && roles.includes('admin')) return true
  return false
}

export function createSupabaseAuthProvider(
  supabaseUrl: string,
  serviceRoleKey: string,
  jwtSecret?: string
): AuthProvider {
  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  async function verifyUser(req: HttpRequestLike): Promise<AuthUser> {
    const authHeader = req.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      const error = new Error('Missing or invalid authorization header') as Error & { status: number }
      error.status = 401
      throw error
    }

    const token = authHeader.substring(7)

    // Try JWT verification first (no DB call)
    if (jwtSecret) {
      try {
        const payload = parseJWT(token)
        if (payload && payload.exp && payload.exp * 1000 > Date.now()) {
          return {
            id: payload.sub,
            email: payload.email,
            isAdmin: extractAdminFromJWT(payload),
          }
        }
      } catch {
        // Fall through to DB verification
      }
    }

    // Fallback: verify via Supabase DB
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)

    if (error || !user) {
      const authError = new Error('Invalid or expired token') as Error & { status: number }
      authError.status = 401
      throw authError
    }

    const isAdmin = extractAdminFromJWT({
      sub: user.id,
      email: user.email,
      app_metadata: user.app_metadata as JWTPayload['app_metadata'],
    })

    return {
      id: user.id,
      email: user.email,
      isAdmin,
    }
  }

  async function verifyAdmin(req: HttpRequestLike): Promise<AuthUser> {
    const user = await verifyUser(req)
    if (!user.isAdmin) {
      const forbiddenError = new Error('Admin access required') as Error & { status: number }
      forbiddenError.status = 403
      throw forbiddenError
    }
    return user
  }

  return { verifyUser, verifyAdmin }
}