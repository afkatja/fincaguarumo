import {
  googleCalendarService,
  BookingData,
  SyncLogEntry,
} from "./google-calendar"
import { createClient } from "@supabase/supabase-js"

// Local Booking type matching the API response structure
type Booking = {
  uid?: string
  start: string
  end: string
  summary?: string
  source?: string
  guestName?: string
  status?: string
  email?: string
  phone?: string
}

export interface SyncResult {
  processed: number
  success: number
  failed: number
  created?: number
  updated?: number
  deleted?: number
  retries?: number
  skipped?: number
  backfill?: boolean
  errors?: Array<{ bookingId: string; error: string }>
}

export interface CalendarSyncResponse {
  checkinEventId?: string
  checkoutEventId?: string
  status: "created" | "updated" | "deleted"
}

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

// For testing, allow mock injection
if (process.env.NODE_ENV === "test") {
  ;(global as any).mockSupabase = supabase
}

/**
 * Convert Booking type to BookingData for Google Calendar sync
 */
function mapBookingToCalendarData(booking: Booking): BookingData {
  if (!booking.uid) {
    throw new Error(`Booking UID is required for calendar sync`)
  }

  return {
    uid: booking.uid,
    guestName: booking.guestName,
    email: booking.email,
    phone: booking.phone,
    source: booking.source || "unknown",
    start: booking.start,
    end: booking.end,
    summary: booking.summary,
  }
}

export class CalendarSyncService {
  /**
   * Perform initial backfill for existing bookings
   */
  async performInitialBackfill(bookings: Booking[]): Promise<SyncResult> {
    const result: SyncResult = {
      processed: 0,
      success: 0,
      failed: 0,
      skipped: 0,
      backfill: true,
      errors: [],
    }

    for (const booking of bookings) {
      result.processed++

      try {
        // Check if already synced
        const { data: existingSync } = await supabase
          .from("gcal_sync_log")
          .select("*")
          .eq("booking_id", booking.uid || "unknown")
          .eq("sync_status", "success")
          .single()

        if (existingSync) {
          result.skipped = (result.skipped || 0) + 1
          continue
        }

        // Sync to calendar
        const calendarData = mapBookingToCalendarData(booking)
        const syncResult = await googleCalendarService.createEvent(calendarData)

        if (syncResult) {
          await this.recordSyncState(booking.uid || "unknown", {
            status: "created",
            checkinEventId: syncResult,
          })
          result.success++
        } else {
          result.failed++
          result.errors?.push({
            bookingId: booking.uid || "unknown",
            error: "Failed to create calendar event",
          })
        }
      } catch (error) {
        result.failed++
        result.errors?.push({
          bookingId: booking.uid || "unknown",
          error: error instanceof Error ? error.message : String(error),
        })
      }
    }

    return result
  }

  /**
   * Get existing sync log for a booking
   */
  async getSyncLog(bookingId: string): Promise<any> {
    try {
      const { data, error } = await supabase
        .from("gcal_sync_log")
        .select("*")
        .eq("booking_id", bookingId)
        .single()

      if (error) {
        // PGRST116: PostgREST error code for "No rows returned" - expected when no sync log exists
        if (error.code === "PGRST116") {
          return null
        }
        throw error
      }

      return data
    } catch (error) {
      console.error(`Failed to get sync log for booking ${bookingId}:`, error)
      return null
    }
  }

  /**
   * Sync all bookings to Google Calendar
   */
  async syncAllBookings(): Promise<{
    total: number
    created: number
    updated: number
    deleted: number
    errors: number
  }> {
    console.log("Starting calendar sync process...")

    const stats = {
      total: 0,
      created: 0,
      updated: 0,
      deleted: 0,
      errors: 0,
    }

    try {
      // Fetch all bookings from the existing merged endpoint
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/api/ical/merged`,
      )
      if (!response.ok) {
        throw new Error(`Failed to fetch bookings: ${response.statusText}`)
      }

      const data = await response.json()
      const bookings = data.bookings || []
      stats.total = bookings.length

      console.log(`Processing ${bookings.length} bookings for calendar sync`)

      // Process each booking
      for (const booking of bookings) {
        try {
          const result = await this.syncBooking(booking)

          if (result === "created") stats.created++
          else if (result === "updated") stats.updated++
          else if (result === "deleted") stats.deleted++
          else if (result === "error") stats.errors++
        } catch (error) {
          console.error(`Error syncing booking ${booking.uid}:`, error)
          stats.errors++
        }
      }

      console.log("Calendar sync completed:", stats)
      return stats
    } catch (error) {
      console.error("Calendar sync failed:", error)
      throw error
    }
  }

  /**
   * Sync a single booking to Google Calendar with retry logic
   */
  private async syncBooking(
    booking: any,
  ): Promise<"created" | "updated" | "deleted" | "error"> {
    // Skip bookings without UIDs
    if (!booking.uid) {
      console.warn("Skipping booking without UID:", booking)
      return "error"
    }

    // Check if booking is cancelled (look for cancellation indicators)
    if (this.isBookingCancelled(booking)) {
      return await this.handleCancelledBooking(booking)
    }

    const maxRetries = 3
    let retryCount = 0
    let lastError: any

    // Retry logic with exponential backoff
    while (retryCount <= maxRetries) {
      try {
        // Convert to our format
        const bookingData: BookingData = {
          uid: booking.uid,
          guestName: booking.guestName,
          email: booking.email,
          phone: booking.phone,
          source: booking.source || "unknown",
          start: booking.start,
          end: booking.end,
          summary: booking.summary,
        }

        // Check existing sync status
        const syncLog = await googleCalendarService.getSyncLog(booking.uid)

        if (!syncLog || !syncLog.gcal_event_id) {
          // Create new event
          const eventId = await googleCalendarService.createEvent(bookingData)
          return eventId ? "created" : "error"
        } else {
          // Check if event still exists in Google Calendar
          const eventExists = await googleCalendarService.eventExists(
            syncLog.gcal_event_id,
          )

          if (!eventExists) {
            // Event was deleted externally, create new one
            const eventId = await googleCalendarService.createEvent(bookingData)
            return eventId ? "created" : "error"
          } else {
            // Update existing event
            const success = await googleCalendarService.updateEvent(
              syncLog.gcal_event_id,
              bookingData,
            )
            return success ? "updated" : "error"
          }
        }
      } catch (error: any) {
        retryCount++
        lastError = error

        if (retryCount > maxRetries) {
          throw error
        }

        // Only retry on rate limit errors (429) or network timeouts
        if (error.code !== 429 && error.code !== "ETIMEDOUT") {
          throw error
        }

        console.warn(
          `Retry ${retryCount}/${maxRetries} for booking ${booking.uid}:`,
          error,
        )
        const delay = Math.pow(2, retryCount) * 1000 // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }

    throw lastError
  }

  /**
   * Check if sync should run based on last sync time (15-minute frequency)
   */
  async shouldRunSync(): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from("gcal_sync_log")
        .select("synced_at")
        .eq("sync_status", "success")
        .order("synced_at", { ascending: false })
        .limit(1)
        .single()

      if (error) {
        if (error.code === "PGRST116") {
          return true // No previous sync, should run
        }
        throw error
      }

      if (!data || !data.synced_at) {
        return true // No previous sync, should run
      }

      const lastSyncTime = new Date(data.synced_at)
      const now = new Date()
      const minutesSinceLastSync =
        (now.getTime() - lastSyncTime.getTime()) / (1000 * 60)

      return minutesSinceLastSync >= 15 // Run if 15+ minutes have passed
    } catch (error) {
      console.error("Failed to check sync status:", error)
      return true // Default to running sync if check fails
    }
  }

  /**
   * Fetch bookings from the existing /api/ical/merged endpoint
   */
  async fetchBookingsFromAPI(): Promise<Booking[]> {
    try {
      const baseUrl =
        process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
      const response = await fetch(`${baseUrl}/api/ical/merged`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch bookings: ${response.statusText}`)
      }

      const data = await response.json()
      return data.bookings || []
    } catch (error) {
      console.error("Failed to fetch bookings from API:", error)
      return []
    }
  }

  /**
   * Record sync state in gcal_sync_log table
   */
  async recordSyncState(
    bookingId: string,
    syncResult: CalendarSyncResponse,
  ): Promise<void> {
    try {
      const logEntry = {
        booking_id: bookingId,
        gcal_checkin_event_id: syncResult.checkinEventId || null,
        gcal_checkout_event_id: syncResult.checkoutEventId || null,
        sync_status: syncResult.status === "deleted" ? "deleted" : "success",
        synced_at: new Date().toISOString(),
      }

      await supabase.from("gcal_sync_log").upsert(logEntry, {
        onConflict: "booking_id",
      })
    } catch (error) {
      console.error("Failed to record sync state:", error)
      throw error
    }
  }
  private async handleCancelledBooking(
    booking: any,
  ): Promise<"deleted" | "error"> {
    const syncLog = await googleCalendarService.getSyncLog(booking.uid)

    if (syncLog?.gcal_event_id) {
      const success = await googleCalendarService.deleteEvent(
        syncLog.gcal_event_id,
        booking.uid,
      )
      return success ? "deleted" : "error"
    }

    // No event to delete
    return "deleted"
  }

  /**
   * Check if a booking is cancelled
   */
  private isBookingCancelled(booking: any): boolean {
    // Check for cancellation indicators in summary or description
    const summary = (booking.summary || "").toLowerCase()
    const description = (booking.description || "").toLowerCase()

    const cancellationKeywords = [
      "cancelled",
      "canceled",
      "deleted",
      "removed",
      "refund",
    ]

    return cancellationKeywords.some(
      keyword => summary.includes(keyword) || description.includes(keyword),
    )
  }

  /**
   * Clean up old sync logs (optional maintenance)
   */
  async cleanupOldLogs(daysOld = 90): Promise<void> {
    try {
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - daysOld)

      const { error } = await supabase
        .from("gcal_sync_log")
        .delete()
        .lt("synced_at", cutoffDate.toISOString())

      if (error) {
        console.error("Failed to cleanup old sync logs:", error)
      } else {
        console.log(`Cleaned up sync logs older than ${daysOld} days`)
      }
    } catch (error) {
      console.error("Error during sync log cleanup:", error)
    }
  }

  /**
   * Get sync statistics
   */
  async getSyncStats(): Promise<{
    totalBookings: number
    syncedBookings: number
    failedSyncs: number
    lastSyncTime: string | null
  }> {
    try {
      // Get total bookings count
      const { count: totalBookings } = await supabase
        .from("bookings")
        .select("*", { count: "exact", head: true })

      // Get sync logs stats
      const { data: syncLogs } = await supabase
        .from("gcal_sync_log")
        .select("status, synced_at")

      const syncedBookings =
        syncLogs?.filter(log => log.status === "success").length || 0
      const failedSyncs =
        syncLogs?.filter(log => log.status === "failed").length || 0
      const lastSyncTime =
        syncLogs && syncLogs.length > 0
          ? syncLogs.sort(
              (a, b) =>
                new Date(b.synced_at).getTime() -
                new Date(a.synced_at).getTime(),
            )[0].synced_at
          : null

      return {
        totalBookings: totalBookings || 0,
        syncedBookings,
        failedSyncs,
        lastSyncTime,
      }
    } catch (error) {
      console.error("Failed to get sync stats:", error)
      return {
        totalBookings: 0,
        syncedBookings: 0,
        failedSyncs: 0,
        lastSyncTime: null,
      }
    }
  }
}

/**
 * Sync bookings to Google Calendar with retry logic
 */
export async function syncBookingsToCalendar(
  bookings: Booking[],
): Promise<SyncResult> {
  const result: SyncResult = {
    processed: 0,
    success: 0,
    failed: 0,
    created: 0,
    updated: 0,
    deleted: 0,
    retries: 0,
    errors: [],
  }

  for (const booking of bookings) {
    result.processed++

    try {
      // Get existing sync state
      const existingSync = await calendarSyncService.getSyncLog(
        booking.uid || "unknown",
      )

      let syncResult: CalendarSyncResponse
      let retryCount = 0
      const maxRetries = 3

      // Retry logic with exponential backoff
      while (retryCount <= maxRetries) {
        try {
          const calendarData = mapBookingToCalendarData(booking)
          const eventId = await googleCalendarService.createEvent(calendarData)
          if (!eventId) {
            throw new Error("Failed to create calendar event")
          }
          syncResult = {
            status: "created",
            checkinEventId: eventId,
          }
          break // Success, exit retry loop
        } catch (error: any) {
          retryCount++

          if (retryCount > maxRetries) {
            throw error
          }

          // Only retry on rate limit errors (429) or network timeouts
          if (error.code !== 429 && error.code !== "ETIMEDOUT") {
            throw error
          }

          result.retries = (result.retries || 0) + 1
          const delay = Math.pow(2, retryCount) * 1000 // Exponential backoff
          await new Promise(resolve => setTimeout(resolve, delay))
        }
      }

      // Record sync state
      await calendarSyncService.recordSyncState(
        booking.uid || "unknown",
        syncResult!,
      )

      // Update counters based on sync result
      if (syncResult!.status === "created") {
        result.created = (result.created || 0) + 1
      } else if (syncResult!.status === "updated") {
        result.updated = (result.updated || 0) + 1
      } else if (syncResult!.status === "deleted") {
        result.deleted = (result.deleted || 0) + 1
      }

      result.success++

      // Handle cancelled bookings - if booking is cancelled, count as deleted regardless of sync result
      if (booking.status === "cancelled") {
        result.deleted = (result.deleted || 0) + 1
        // Don't count cancelled bookings as created/updated
        if (syncResult!.status === "created") {
          result.created = (result.created || 0) - 1
        } else if (syncResult!.status === "updated") {
          result.updated = (result.updated || 0) - 1
        }
      }
    } catch (error) {
      result.failed++
      result.errors?.push({
        bookingId: booking.uid || "unknown",
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  return result
}

// Singleton instance
export const calendarSyncService = new CalendarSyncService()
