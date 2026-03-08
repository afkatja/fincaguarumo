import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

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

    // Check admin status from database only (trusted source)
    const { data: userData, error: userError } = await supabaseAdmin
      .from("users")
      .select("is_admin")
      .eq("id", user.id)
      .single()

    let isAdmin = false
    if (!userError && userData) {
      isAdmin = userData.is_admin
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

    // Check admin status from database only (trusted source)
    const { data: userData, error: userError } = await supabaseAdmin
      .from("users")
      .select("is_admin")
      .eq("id", user.id)
      .single()

    if (userError) {
      // Distinguish between "not found" and actual database failures
      if ((userError as any).code === "PGRST116" || !userData) {
        // PGRST116: No rows returned - user not found in users table
        const adminError = new Error(
          "User not found or admin status cannot be verified",
        )
        ;(adminError as any).status = 403
        throw adminError
      } else {
        // Real database failure (missing table, connection issues, etc.)
        const serverError = new Error(
          `Database error during admin verification: ${(userError as any).message || "Unknown database error"}`,
        )
        ;(serverError as any).status = 500
        throw serverError
      }
    }

    if (!userData.is_admin) {
      const forbiddenError = new Error("Admin access required")
      ;(forbiddenError as any).status = 403
      throw forbiddenError
    }

    return {
      id: user.id,
      email: user.email,
      is_admin: userData.is_admin,
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
