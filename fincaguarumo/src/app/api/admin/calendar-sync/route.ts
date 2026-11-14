import { NextResponse } from "next/server"
import { verifyAdminAuth, createSupabaseAdmin } from "@/lib/auth"
import { calendarSyncService } from "@/lib/calendar-sync"
import { googleCalendarService } from "@/lib/google-calendar"

/**
 * Admin-only calendar sync API endpoint
 * Requires admin authentication via JWT token
 * Calls calendarSyncService directly (no internal HTTP proxying)
 */
export async function GET(request: Request) {
  try {
    const adminUser = await verifyAdminAuth(request)

    const stats = await calendarSyncService.getSyncStats()
    const calendarAccess = await googleCalendarService.testAccess()
    const recentSyncLogs = await getRecentSyncLogs()

    return NextResponse.json({
      status: "success",
      data: {
        sync: stats,
        calendar: {
          accessible: calendarAccess,
          calendarId: process.env.GOOGLE_CALENDAR_ID,
        },
        lastChecked: new Date().toISOString(),
        recentSyncLogs,
      },
      requestedBy: adminUser.email,
    })
  } catch (error: any) {
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
    const adminUser = await verifyAdminAuth(request)

    const body = await request.json().catch(() => ({}))
    const options = {
      cleanup: body.cleanup || false,
      dryRun: body.dryRun || false,
      force: body.force || false,
    }

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

    let stats
    if (options.dryRun) {
      stats = await performDryRun()
    } else if (!options.force && !(await calendarSyncService.shouldRunSync())) {
      return NextResponse.json({
        status: "skipped",
        message: "Sync not due yet",
        data: {
          sync: {
            total: 0,
            created: 0,
            updated: 0,
            deleted: 0,
            errors: 0,
            skipped: true,
          },
          options,
        },
        completedAt: new Date().toISOString(),
        triggeredBy: adminUser.email,
      })
    } else {
      stats = await calendarSyncService.syncAllBookings()
    }

    if (options.cleanup && !options.dryRun) {
      await calendarSyncService.cleanupOldLogs(90)
    }

    return NextResponse.json({
      status: "success",
      message: options.dryRun ? "Dry run completed" : "Calendar sync completed",
      data: {
        sync: stats,
        options,
        completedAt: new Date().toISOString(),
      },
      triggeredBy: adminUser.email,
    })
  } catch (error: any) {
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

export async function PUT() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 })
}

export async function DELETE() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 })
}

export async function PATCH() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 })
}

async function performDryRun(): Promise<{
  total: number
  created: number
  updated: number
  deleted: number
  errors: number
  dryRun: boolean
}> {
  try {
    const bookings = await calendarSyncService.fetchBookings()
    const stats = {
      total: bookings.length,
      created: 0,
      updated: 0,
      deleted: 0,
      errors: 0,
      dryRun: true,
    }

    for (const booking of bookings) {
      try {
        if (!booking.uid) {
          stats.errors++
          continue
        }

        if (booking.isTest) {
          stats.deleted++
          continue
        }

        const summary = (booking.summary || "").toLowerCase()
        const isCancelled =
          booking.status === "cancelled" ||
          booking.status === "canceled" ||
          /\bcancelled\b|\bcanceled\b|\bdeleted\b/.test(summary)

        if (isCancelled) {
          stats.deleted++
        } else {
          const syncLog = await calendarSyncService.getSyncLog(booking.uid)
          if (!syncLog || !syncLog.gcal_event_id) {
            stats.created++
          } else {
            stats.updated++
          }
        }
      } catch {
        stats.errors++
      }
    }

    return stats
  } catch (error) {
    console.error("Dry run failed:", error)
    throw error
  }
}

async function getRecentSyncLogs(limit = 10) {
  try {
    const supabase = createSupabaseAdmin()

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
  } catch {
    return []
  }
}
