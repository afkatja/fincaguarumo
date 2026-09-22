import { createClient } from "@supabase/supabase-js"

// Validate required environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl) {
  throw new Error(
    "NEXT_PUBLIC_SUPABASE_URL environment variable is required. Please check your .env file.",
  )
}

if (!supabaseServiceKey) {
  throw new Error(
    "SUPABASE_SERVICE_ROLE_KEY environment variable is required. Please check your .env file.",
  )
}

// Create Supabase client with service role key for admin operations
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

export interface AuthUser {
  id: string
  email?: string
  is_admin: boolean
}

/**
 * Extracts admin status from user's app_metadata (set via database trigger)
 * Falls back to database check if app_metadata is not available
 */
function getAdminStatusFromUser(user: any): boolean {
  // Check app_metadata.role first (zero-DB lookup)
  const appMetadata = user.app_metadata
  if (appMetadata && typeof appMetadata === "object") {
    const role = appMetadata.role
    if (role === "admin") return true
    if (role === "user") return false
  }

  // Fallback: could query database here if needed, but for now default to false
  // The database trigger should have synced app_metadata for all users
  return false
}

/**
 * Verifies the current user's authentication (not requiring admin)
 * @param request - The incoming request object
 * @returns AuthUser object if authenticated
 * @throws Error with appropriate status code (401 for unauthenticated)
 */
export async function verifyUserAuth(request: Request): Promise<AuthUser> {
  try {
    // Extract the Authorization header
    const authHeader = request.headers.get("authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      const error = new Error("Missing or invalid authorization header")
      ;(error as any).status = 401
      throw error
    }

    const token = authHeader.substring(7) // Remove 'Bearer ' prefix

    // Verify the JWT token using Supabase admin client
    const {
      data: { user },
      error,
    } = await supabaseAdmin.auth.getUser(token)

    if (error || !user) {
      const authError = new Error("Invalid or expired token")
      ;(authError as any).status = 401
      throw authError
    }

    // Check admin status from JWT app_metadata (zero-DB lookup)
    const isAdmin = getAdminStatusFromUser(user)

    return {
      id: user.id,
      email: user.email,
      is_admin: isAdmin,
    }
  } catch (error: any) {
    // Re-throw errors with their status codes
    if (error.status) {
      throw error
    }

    // For any other errors, treat as internal server error
    const serverError = new Error("Authentication failed")
    ;(serverError as any).status = 500
    throw serverError
  }
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
    const authHeader = request.headers.get("authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      const error = new Error("Missing or invalid authorization header")
      ;(error as any).status = 401
      throw error
    }

    const token = authHeader.substring(7) // Remove 'Bearer ' prefix

    // Verify the JWT token using Supabase admin client
    const {
      data: { user },
      error,
    } = await supabaseAdmin.auth.getUser(token)

    if (error || !user) {
      const authError = new Error("Invalid or expired token")
      ;(authError as any).status = 401
      throw authError
    }

    // Check admin status from JWT app_metadata (zero-DB lookup)
    const isAdmin = getAdminStatusFromUser(user)

    if (!isAdmin) {
      const forbiddenError = new Error("Admin access required")
      ;(forbiddenError as any).status = 403
      throw forbiddenError
    }

    return {
      id: user.id,
      email: user.email,
      is_admin: isAdmin,
    }
  } catch (error: any) {
    // Re-throw errors with their status codes
    if (error.status) {
      throw error
    }

    // For any other errors, treat as internal server error
    const serverError = new Error("Authentication failed")
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
