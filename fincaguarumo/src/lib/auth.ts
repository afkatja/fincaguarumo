import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Create Supabase client with service role key for admin operations
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

export interface AuthUser {
  id: string
  email?: string
  is_admin: boolean
}

/**
 * Verifies the current user's authentication and admin status
 * @param request - The incoming request object
 * @returns AuthUser object if authenticated and authorized
 * @throws Error with appropriate status code (401 for unauthenticated, 403 for unauthorized)
 */
export async function verifyAdminAuth(request: Request): Promise<AuthUser> {
  try {
    // Extract the Authorization header
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      const error = new Error('Missing or invalid authorization header')
      ;(error as any).status = 401
      throw error
    }

    const token = authHeader.substring(7) // Remove 'Bearer ' prefix

    // Verify the JWT token using Supabase admin client
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
    
    if (error || !user) {
      const authError = new Error('Invalid or expired token')
      ;(authError as any).status = 401
      throw authError
    }

    // Check if user has admin rights
    // First, check if there's an is_admin claim in the user metadata
    if (user.user_metadata?.is_admin === true) {
      return {
        id: user.id,
        email: user.email,
        is_admin: true
      }
    }

    // If not in metadata, check the users table (you may need to create this table)
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('is_admin')
      .eq('id', user.id)
      .single()

    if (userError) {
      // If users table doesn't exist or user not found, deny access
      const adminError = new Error('User not found or admin status cannot be verified')
      ;(adminError as any).status = 403
      throw adminError
    }

    if (!userData.is_admin) {
      const forbiddenError = new Error('Admin access required')
      ;(forbiddenError as any).status = 403
      throw forbiddenError
    }

    return {
      id: user.id,
      email: user.email,
      is_admin: userData.is_admin
    }

  } catch (error: any) {
    // Re-throw errors with their status codes
    if (error.status) {
      throw error
    }
    
    // For any other errors, treat as internal server error
    const serverError = new Error('Authentication failed')
    ;(serverError as any).status = 500
    throw serverError
  }
}

/**
 * Creates a Supabase admin client for server-side operations
 */
export function createSupabaseAdmin() {
  return supabaseAdmin
}
