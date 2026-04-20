import { NextResponse } from "next/server"
import { calendarSyncService } from "@/lib/calendar-sync"
import { googleCalendarService } from "@/lib/google-calendar"

// Security: Simple API key validation for cron jobs
const CRON_SECRET = process.env.CALENDAR_SYNC_SECRET

/**
 * Calendar sync API endpoint
 * Can be called by Netlify cron jobs or manually
 *
 * Methods:
 * - GET: Get sync status and statistics
 * - POST: Trigger calendar sync
 */
export async function GET(request: Request) {
  try {
    // Validate request (optional for GET)
    const url = new URL(request.url)
    const providedSecret = url.searchParams.get("secret")

    if (CRON_SECRET && providedSecret !== CRON_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get sync statistics
    const stats = await calendarSyncService.getSyncStats()

    // Test Google Calendar access
    const calendarAccess = await googleCalendarService.testAccess()

    return NextResponse.json({
      status: "success",
      data: {
        sync: stats,
        calendar: {
          accessible: calendarAccess,
          calendarId: process.env.GOOGLE_CALENDAR_ID,
        },
        lastChecked: new Date().toISOString(),
      },
    })
  } catch (error) {
    console.error("Calendar sync GET error:", error)
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
    // Validate cron secret
    const url = new URL(request.url)
    const providedSecret = url.searchParams.get("secret")

    if (CRON_SECRET && providedSecret !== CRON_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Parse request body for options
    const body = await request.json().catch(() => ({}))
    const options = {
      cleanup: body.cleanup || false, // Whether to run cleanup
      dryRun: body.dryRun || false, // Test mode without actual changes
    }

    console.log("Starting calendar sync with options:", options)

    // Test calendar access before proceeding
    const calendarAccess = await googleCalendarService.testAccess()
    if (!calendarAccess) {
      return NextResponse.json(
        {
          error: "Calendar access failed",
          message:
            "Cannot access Google Calendar. Check credentials and permissions.",
        },
        { status: 503 },
      )
    }

    // Perform sync
    const stats = await calendarSyncService.syncAllBookings()

    // Optional cleanup of old logs
    if (options.cleanup) {
      await calendarSyncService.cleanupOldLogs(90) // Clean up logs older than 90 days
    }

    const response = {
      status: "success",
      message: "Calendar sync completed",
      data: {
        sync: stats,
        options,
        completedAt: new Date().toISOString(),
      },
    }

    console.log("Calendar sync completed:", response.data)

    return NextResponse.json(response)
  } catch (error) {
    console.error("Calendar sync POST error:", error)
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
