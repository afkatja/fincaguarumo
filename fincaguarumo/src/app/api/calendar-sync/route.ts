import { NextResponse } from "next/server"
import { calendarSyncService } from "@/lib/calendar-sync"
import { googleCalendarService } from "@/lib/google-calendar"

// Security: Simple API key validation for cron jobs
const CRON_SECRET = process.env.CALENDAR_SYNC_SECRET

/**
 * Constant-time comparison to prevent timing attacks
 */
function constantTimeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false
  }

  let result = 0
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }

  return result === 0
}

/**
 * Validate cron secret with fail-closed security
 */
function validateCronSecret(providedSecret: string | null): boolean {
  // Fail closed: require CRON_SECRET to be set and valid
  if (!CRON_SECRET) {
    console.error("CRON_SECRET environment variable is not set")
    return false
  }

  if (!providedSecret) {
    console.error("No secret provided in request")
    return false
  }

  return constantTimeCompare(providedSecret, CRON_SECRET)
}

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
    // Validate request (required for security)
    const url = new URL(request.url)
    const providedSecret = url.searchParams.get("secret")

    if (!validateCronSecret(providedSecret)) {
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

    if (!validateCronSecret(providedSecret)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Parse request body for options
    const body = await request.json().catch(() => ({}))
    const options = {
      cleanup: body.cleanup || false, // Whether to run cleanup
      dryRun: body.dryRun || false, // Test mode without actual changes
      force: body.force || false, // Force sync even if not scheduled
    }

    console.log("Starting calendar sync with options:", options)

    // Check if sync should run (unless forced)
    if (!options.force && !options.dryRun) {
      const shouldRun = await calendarSyncService.shouldRunSync()
      if (!shouldRun) {
        return NextResponse.json({
          status: "skipped",
          message: "Sync skipped - not time to run yet (15-minute frequency)",
          data: {
            nextRunIn: "15 minutes",
            lastSyncTime: await getLastSyncTime(),
          },
        })
      }
    }

    // Test calendar access before proceeding (skip in dry run)
    if (!options.dryRun) {
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
    }

    // Perform sync or dry run
    let stats
    if (options.dryRun) {
      stats = await performDryRun()
    } else {
      stats = await calendarSyncService.syncAllBookings()
    }

    // Optional cleanup of old logs
    if (options.cleanup && !options.dryRun) {
      await calendarSyncService.cleanupOldLogs(90) // Clean up logs older than 90 days
    }

    const response = {
      status: "success",
      message: options.dryRun ? "Dry run completed" : "Calendar sync completed",
      data: {
        sync: stats,
        options,
        completedAt: new Date().toISOString(),
        cronJob: {
          frequency: "15 minutes",
          nextRun: getNextRunTime(),
        },
      },
    }

    console.log(
      `Calendar sync ${options.dryRun ? "dry run" : "completed"}:`,
      response.data,
    )

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

// Helper functions for cron job scheduling
async function getLastSyncTime(): Promise<string | null> {
  try {
    const stats = await calendarSyncService.getSyncStats()
    return stats.lastSyncTime
  } catch {
    return null
  }
}

function getNextRunTime(): string {
  const now = new Date()
  const nextRun = new Date(now.getTime() + 15 * 60 * 1000) // 15 minutes from now
  return nextRun.toISOString()
}

// Dry run function to simulate sync without making changes
async function performDryRun(): Promise<{
  total: number
  created: number
  updated: number
  deleted: number
  errors: number
  dryRun: boolean
}> {
  try {
    // Fetch bookings to see what would be processed
    const bookings = await calendarSyncService.fetchBookingsFromAPI()
    const stats = {
      total: bookings.length,
      created: 0,
      updated: 0,
      deleted: 0,
      errors: 0,
      dryRun: true,
    }

    // Simulate processing without actual calendar operations
    for (const booking of bookings) {
      try {
        if (!booking.uid) {
          stats.errors++
          continue
        }

        if (booking.isTest) {
          continue // Skip test bookings
        }

        if (booking.status === "cancelled" || booking.status === "canceled") {
          stats.deleted++
        } else {
          // Check if would be created or updated
          const syncLog = await calendarSyncService.getSyncLog(booking.uid)
          if (!syncLog || !syncLog.gcal_event_id) {
            stats.created++
          } else {
            stats.updated++
          }
        }
      } catch (error) {
        stats.errors++
      }
    }

    return stats
  } catch (error) {
    console.error("Dry run failed:", error)
    throw error
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
