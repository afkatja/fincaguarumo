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
    console.log(`Admin ${adminUser.email} requested calendar sync status`)

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

    const response = await fetch(apiUrl.toString(), {
      method: "GET",
    })

    if (!response.ok) {
      throw new Error(`Internal sync API failed with status ${response.status}`)
    }

    const data = await response.json()

    return NextResponse.json({
      status: "success",
      data: data.data,
      requestedBy: adminUser.email,
    })
  } catch (error: any) {
    console.error("Admin calendar sync GET error:", error)

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
    console.log(`Admin ${adminUser.email} triggered calendar sync`)

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

    const response = await fetch(apiUrl.toString(), {
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

    const data = await response.json()

    return NextResponse.json({
      status: "success",
      data: data.data,
      message: data.message,
      triggeredBy: adminUser.email,
    })
  } catch (error: any) {
    console.error("Admin calendar sync POST error:", error)

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
