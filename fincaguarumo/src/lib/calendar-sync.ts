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
  isTest?: boolean
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
  eventId?: string
  status: "created" | "updated" | "deleted"
}

function requireServerEnv(name: string, publicFallback?: string): string {
  const value =
    process.env[name] ||
    (publicFallback ? process.env[publicFallback] : undefined)
  if (!value) {
    console.error(
      `[calendar-sync] Missing required environment variable: ${name}${publicFallback ? ` (or ${publicFallback})` : ""}`,
    )
    throw new Error(
      `${name} environment variable is required${publicFallback ? ` (or ${publicFallback})` : ""}`,
    )
  }
  return value
}

// Lazy Supabase client initialization
let supabase: ReturnType<typeof createClient> | null = null
let siteUrl: string | null = null
let overrideSupabaseClient: ReturnType<typeof createClient> | null = null
let overrideSiteUrl: string | null = null

/**
 * Override the Supabase client for testing purposes
 * Call this before any calendar sync operations in tests
 */
export function setTestSupabaseClient(client: ReturnType<typeof createClient>) {
  overrideSupabaseClient = client
}

/**
 * Override the site URL for testing purposes
 */
export function setTestSiteUrl(url: string) {
  overrideSiteUrl = url
}

/**
 * Reset test overrides (call this in test afterEach)
 */
export function resetTestOverrides() {
  overrideSupabaseClient = null
  overrideSiteUrl = null
  supabase = null
  siteUrl = null
}

function getSupabaseClient() {
  if (overrideSupabaseClient) {
    return overrideSupabaseClient
  }
  if (!supabase) {
    const supabaseUrl = requireServerEnv(
      "SUPABASE_URL",
      "NEXT_PUBLIC_SUPABASE_URL",
    )
    const supabaseServiceKey = requireServerEnv("SUPABASE_SERVICE_ROLE_KEY")
    supabase = createClient(supabaseUrl, supabaseServiceKey)
  }
  return supabase
}

function getSiteUrl() {
  if (overrideSiteUrl) {
    return overrideSiteUrl
  }
  if (!siteUrl) {
    siteUrl = requireServerEnv("SITE_URL", "NEXT_PUBLIC_SITE_URL")
  }
  return siteUrl
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
        const { data: existingSync } = await getSupabaseClient()
          .from("gcal_sync_log")
          .select("*")
          .eq("booking_id", booking.uid || "unknown")
          .eq("status", "success")
          .single()

        if (existingSync) {
          result.skipped = (result.skipped || 0) + 1
          continue
        }

        // Sync to calendar
        const calendarData = mapBookingToCalendarData(booking)
        const eventId = await googleCalendarService.createEvent(calendarData)

        if (eventId) {
          await this.recordSyncState(
            booking.uid || "unknown",
            eventId,
            "success",
          )
          result.success++
        } else {
          await this.recordSyncState(
            booking.uid || "unknown",
            null,
            "failed",
            "Failed to create calendar event",
          )
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
      const { data, error } = await getSupabaseClient()
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
      const response = await fetch(`${getSiteUrl()}/api/ical/merged`)
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
   * Exported for testing purposes
   */
  async syncBooking(
    booking: any,
  ): Promise<"created" | "updated" | "deleted" | "error"> {
    // Skip bookings without UIDs
    if (!booking.uid) {
      console.warn("Skipping booking without UID:", booking)
      return "error"
    }

    // Skip test bookings and clean up any existing calendar events
    if (booking.isTest) {
      console.log(
        `Processing test booking ${booking.uid} - cleaning up any existing calendar events`,
      )

      try {
        const syncLog = await googleCalendarService.getSyncLog(booking.uid)

        if (syncLog?.gcal_event_id) {
          // Check if event exists in Google Calendar before deleting
          const eventExists = await googleCalendarService.eventExists(
            syncLog.gcal_event_id,
          )

          if (eventExists) {
            const success = await googleCalendarService.deleteEvent(
              syncLog.gcal_event_id,
              booking.uid,
            )

            if (success) {
              await this.recordSyncState(booking.uid, null, "success")
              console.log(
                `Deleted existing calendar event ${syncLog.gcal_event_id} for test booking ${booking.uid}`,
              )
              return "deleted"
            } else {
              await this.recordSyncState(
                booking.uid,
                syncLog.gcal_event_id,
                "failed",
                "Failed to delete calendar event for test booking",
              )
              return "error"
            }
          } else {
            await this.recordSyncState(booking.uid, null, "success")
            console.log(
              `Event ${syncLog.gcal_event_id} not found in Google Calendar for test booking ${booking.uid} - already deleted`,
            )
            return "deleted" // Event already gone, treat as success
          }
        } else {
          // No existing event to delete, just record that we skipped this test booking
          console.log(
            `No existing calendar event found for test booking ${booking.uid}`,
          )
          return "deleted"
        }
      } catch (error) {
        console.error(`Error processing test booking ${booking.uid}:`, error)
        return "error"
      }
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
          if (eventId) {
            await this.recordSyncState(booking.uid, eventId, "success")
            return "created"
          } else {
            await this.recordSyncState(
              booking.uid,
              null,
              "failed",
              "Failed to create calendar event",
            )
            return "error"
          }
        } else {
          // Check if event still exists in Google Calendar
          const eventExists = await googleCalendarService.eventExists(
            syncLog.gcal_event_id,
          )

          if (!eventExists) {
            // Event was deleted externally, try to find it by booking UID before creating new one
            const existingEventId =
              await googleCalendarService.findEventByBookingUid(booking.uid)

            if (existingEventId) {
              // Found the event via search, update the sync log with the correct ID
              await this.recordSyncState(
                booking.uid,
                existingEventId,
                "success",
              )
              console.log(
                `Recovered missing event ${existingEventId} for booking ${booking.uid} via UID search`,
              )
              // Now update the event
              const success = await googleCalendarService.updateEvent(
                existingEventId,
                bookingData,
              )
              if (success) {
                await this.recordSyncState(
                  booking.uid,
                  existingEventId,
                  "success",
                )
                return "updated"
              } else {
                await this.recordSyncState(
                  booking.uid,
                  existingEventId,
                  "failed",
                  "Failed to update recovered calendar event",
                )
                return "error"
              }
            } else {
              // Event truly doesn't exist, create new one
              const eventId =
                await googleCalendarService.createEvent(bookingData)
              if (eventId) {
                await this.recordSyncState(booking.uid, eventId, "success")
                return "created"
              } else {
                await this.recordSyncState(
                  booking.uid,
                  null,
                  "failed",
                  "Failed to create calendar event",
                )
                return "error"
              }
            }
          } else {
            // Update existing event
            const success = await googleCalendarService.updateEvent(
              syncLog.gcal_event_id,
              bookingData,
            )
            if (success) {
              await this.recordSyncState(
                booking.uid,
                syncLog.gcal_event_id,
                "success",
              )
              return "updated"
            } else {
              await this.recordSyncState(
                booking.uid,
                syncLog.gcal_event_id,
                "failed",
                "Failed to update calendar event",
              )
              return "error"
            }
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
      const { data, error } = await getSupabaseClient()
        .from("gcal_sync_log")
        .select("synced_at")
        .eq("status", "success")
        .order("synced_at", { ascending: false })
        .limit(1)
        .single()

      if (error) {
        if (error.code === "PGRST116") {
          return true // No previous sync, should run
        }
        throw error
      }

      if (!data || !(data as any).synced_at) {
        return true // No previous sync, should run
      }

      const lastSyncTime = new Date((data as any).synced_at)
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
      const response = await fetch(`${getSiteUrl()}/api/ical/merged`, {
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
    eventId: string | null,
    status: "success" | "failed" | "pending" | "cancelled" = "success",
    errorMessage?: string,
  ): Promise<void> {
    try {
      const logEntry = {
        booking_id: bookingId,
        gcal_event_id: eventId,
        status,
        error_message: errorMessage,
        synced_at: new Date().toISOString(),
      }

      await (getSupabaseClient() as any)
        .from("gcal_sync_log")
        .upsert(logEntry, {
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
    try {
      const syncLog = await googleCalendarService.getSyncLog(booking.uid)

      if (syncLog?.gcal_event_id) {
        // Check if event exists in Google Calendar before deleting
        const eventExists = await googleCalendarService.eventExists(
          syncLog.gcal_event_id,
        )

        if (eventExists) {
          const success = await googleCalendarService.deleteEvent(
            syncLog.gcal_event_id,
            booking.uid,
          )

          if (success) {
            await this.recordSyncState(booking.uid, null, "cancelled")
            return "deleted"
          } else {
            await this.recordSyncState(
              booking.uid,
              syncLog.gcal_event_id,
              "failed",
              "Failed to delete calendar event",
            )
            return "error"
          }
        } else {
          await this.recordSyncState(booking.uid, null, "cancelled")
          return "deleted" // Event already gone, treat as cancelled
        }
      } else {
        return "deleted" // No event to delete, treat as success
      }
    } catch (error) {
      console.error(`Error handling cancelled booking ${booking.uid}:`, error)
      await this.recordSyncState(
        booking.uid,
        null,
        "failed",
        error instanceof Error ? error.message : String(error),
      )
      return "error"
    }
  }

  /**
   * Check if a booking is cancelled
   */
  private isBookingCancelled(booking: any): boolean {
    // Check explicit status field first
    if (booking.status === "cancelled" || booking.status === "canceled") {
      return true
    }

    // Check for cancellation indicators in summary or description
    // Use more specific patterns to avoid false positives
    const summary = (booking.summary || "").toLowerCase()
    const description = (booking.description || "").toLowerCase()

    // More specific cancellation patterns that are less likely to match legitimate bookings
    const cancellationPatterns = [
      // Exact status indicators
      /\bcancelled\b/i,
      /\bcanceled\b/i,
      /\bdeleted\b/i,
      // Cancellation-related phrases (with word boundaries)
      /\bbooking cancelled\b/i,
      /\bbooking canceled\b/i,
      /\breservation cancelled\b/i,
      /\breservation canceled\b/i,
      // Refund patterns (more specific)
      /\brefund processed\b/i,
      /\bfull refund\b/i,
      /\bpartial refund\b/i,
    ]

    return cancellationPatterns.some(pattern => {
      return pattern.test(summary) || pattern.test(description)
    })
  }

  /**
   * Clean up old sync logs (optional maintenance)
   */
  async cleanupOldLogs(daysOld = 90): Promise<void> {
    try {
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - daysOld)

      const { error } = await getSupabaseClient()
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
      const { count: totalBookings } = await getSupabaseClient()
        .from("bookings")
        .select("*", { count: "exact", head: true })

      // Get sync logs stats
      const { data: syncLogs } = await getSupabaseClient()
        .from("gcal_sync_log")
        .select("status, synced_at")

      const syncedBookings =
        syncLogs?.filter((log: any) => log.status === "success").length || 0
      const failedSyncs =
        syncLogs?.filter((log: any) => log.status === "failed").length || 0
      const lastSyncTime =
        syncLogs && syncLogs.length > 0
          ? (
              syncLogs.sort(
                (a: any, b: any) =>
                  new Date(b.synced_at).getTime() -
                  new Date(a.synced_at).getTime(),
              )[0] as any
            ).synced_at
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
      // Skip test bookings
      if (booking.isTest) {
        console.log(`Skipping test booking ${booking.uid} from calendar sync`)
        result.skipped = (result.skipped || 0) + 1
        continue
      }

      // Get existing sync state
      const existingSync = await getCalendarSyncService().getSyncLog(
        booking.uid || "unknown",
      )

      let syncResult: CalendarSyncResponse
      let retryCount = 0
      const maxRetries = 3

      // Check if booking is cancelled first
      if (booking.status === "cancelled") {
        // Handle cancelled booking with retry logic
        while (retryCount <= maxRetries) {
          try {
            if (existingSync?.gcal_event_id) {
              // Check if event exists before deleting
              const eventExists = await googleCalendarService.eventExists(
                existingSync.gcal_event_id,
              )

              if (eventExists) {
                const success = await googleCalendarService.deleteEvent(
                  existingSync.gcal_event_id,
                  booking.uid || "unknown",
                )

                if (success) {
                  syncResult = {
                    status: "deleted",
                  }
                  break // Success, exit retry loop
                } else {
                  throw new Error("Failed to delete calendar event")
                }
              } else {
                // Event doesn't exist, treat as deleted
                syncResult = {
                  status: "deleted",
                }
                break
              }
            } else {
              // No existing event, treat as deleted
              syncResult = {
                status: "deleted",
              }
              break
            }
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
      } else {
        // Handle active booking with retry logic
        while (retryCount <= maxRetries) {
          try {
            const calendarData = mapBookingToCalendarData(booking)

            if (!existingSync || !existingSync.gcal_event_id) {
              // Create new event
              const eventId =
                await googleCalendarService.createEvent(calendarData)
              if (!eventId) {
                throw new Error("Failed to create calendar event")
              }
              syncResult = {
                status: "created",
                eventId,
              }
            } else {
              // Check if event still exists in Google Calendar
              const eventExists = await googleCalendarService.eventExists(
                existingSync.gcal_event_id,
              )

              if (!eventExists) {
                // Event was deleted externally, create new one
                const eventId =
                  await googleCalendarService.createEvent(calendarData)
                if (!eventId) {
                  throw new Error("Failed to create calendar event")
                }
                syncResult = {
                  status: "created",
                  eventId,
                }
              } else {
                // Update existing event
                const success = await googleCalendarService.updateEvent(
                  existingSync.gcal_event_id,
                  calendarData,
                )
                if (success) {
                  syncResult = {
                    status: "updated",
                    eventId: existingSync.gcal_event_id,
                  }
                }
              }
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
      }

      // Record sync state
      await getCalendarSyncService().recordSyncState(
        booking.uid || "unknown",
        syncResult!.eventId || null,
        syncResult!.status === "deleted" ? "success" : "success",
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
let calendarSyncServiceInstance: CalendarSyncService | null = null

export function getCalendarSyncService(): CalendarSyncService {
  if (!calendarSyncServiceInstance) {
    calendarSyncServiceInstance = new CalendarSyncService()
  }
  return calendarSyncServiceInstance
}

/**
 * Reset the singleton instance for testing
 * Call this in test afterEach
 */
export function resetCalendarSyncService() {
  calendarSyncServiceInstance = null
}

// Export singleton for backward compatibility
export const calendarSyncService = getCalendarSyncService()
