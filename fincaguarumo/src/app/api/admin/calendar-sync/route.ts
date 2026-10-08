import { NextResponse } from "next/server"
import { verifyAdminAuth } from "@/lib/auth"
import { calendarSyncService } from "@/lib/calendar-sync"
import { googleCalendarService } from "@/lib/google-calendar"

// Server-side calendar sync secret (not exposed to client)
const CALENDAR_SYNC_SECRET = process.env.CALENDAR_SYNC_SECRET

/**
 * Admin-only calendar sync API endpoint
 * Requires admin authentication via JWT token
 *
 * Methods:
 * - GET: Get sync status and statistics
 * - POST: Trigger calendar sync
 */
export async function GET(request: Request) {
  try {
    // Verify admin authentication
    const adminUser = await verifyAdminAuth(request)

    // Get sync statistics using the internal API with server-side secret
    if (!CALENDAR_SYNC_SECRET) {
      throw new Error(
        "CALENDAR_SYNC_SECRET environment variable is not configured",
      )
    }

    const apiUrl = new URL(
      "/api/calendar-sync",
      process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
    )
    apiUrl.searchParams.set("secret", CALENDAR_SYNC_SECRET)

    const response = await fetchWithTimeout(apiUrl.toString(), {
      method: "GET",
    })

    if (!response.ok) {
      throw new Error(`Internal sync API failed with status ${response.status}`)
    }

    const res = await response.json()

    // Fetch recent sync logs
    const recentSyncLogs = await getRecentSyncLogs()

    return NextResponse.json({
      status: "success",
      data: {
        ...res.data,
        recentSyncLogs,
      },
      requestedBy: adminUser.email,
    })
  } catch (error: any) {
    // Handle auth errors specifically
    if (error.status === 401) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      )
    }
    if (error.status === 403) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 },
      )
    }

    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

export async function POST(request: Request) {
  try {
    // Verify admin authentication
    const adminUser = await verifyAdminAuth(request)

    // Parse request body for options
    const body = await request.json().catch(() => ({}))
    const options = {
      cleanup: body.cleanup || false,
      dryRun: body.dryRun || false,
      force: body.force || false,
    }

    // Call the internal calendar sync API with server-side secret
    if (!CALENDAR_SYNC_SECRET) {
      throw new Error(
        "CALENDAR_SYNC_SECRET environment variable is not configured",
      )
    }

    const apiUrl = new URL(
      "/api/calendar-sync",
      process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
    )
    apiUrl.searchParams.set("secret", CALENDAR_SYNC_SECRET)

    const response = await fetchWithTimeout(apiUrl.toString(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(options),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(
        errorData.message ||
          `Internal sync API failed with status ${response.status}`,
      )
    }

    const res = await response.json()

    return NextResponse.json({
      status: "success",
      data: res.data,
      message: res.message,
      triggeredBy: adminUser.email,
    })
  } catch (error: any) {
    // Handle auth errors specifically
    if (error.status === 401) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      )
    }
    if (error.status === 403) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 },
      )
    }

    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

// Handle unsupported methods
export async function PUT() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 })
}

export async function DELETE() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 })
}

export async function PATCH() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 })
}

// Helper function to fetch recent sync logs

// Helper function to fetch with timeout
async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs = 10000,
): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    })
    clearTimeout(timeoutId)
    return response
  } catch (error) {
    clearTimeout(timeoutId)
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`Request timeout after ${timeoutMs}ms`)
    }
    throw error
  }
}

async function getRecentSyncLogs(limit = 10) {
  try {
    const { createClient } = await import("@supabase/supabase-js")
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { data, error } = await supabase
      .from("gcal_sync_log")
      .select(
        `
        *,
        bookings (
          uid,
          guest_name,
          source,
          email,
          phone
        )
      `,
      )
      .order("synced_at", { ascending: false })
      .limit(limit)

    if (error) {
      return []
    }

    return data || []
  } catch (error) {
    return []
  }
}
