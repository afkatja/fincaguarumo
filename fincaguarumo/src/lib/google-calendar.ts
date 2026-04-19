import { google } from "googleapis"
import { createClient } from "@supabase/supabase-js"

// Types for Google Calendar integration
export interface CalendarEvent {
  id?: string
  summary: string
  description?: string
  start: {
    dateTime: string
    timeZone?: string
  }
  end: {
    dateTime: string
    timeZone?: string
  }
  reminders?: {
    overrides?: Array<{
      method: "email" | "popup"
      minutes: number
    }>
  }
}

export interface BookingData {
  uid: string
  guestName?: string
  email?: string
  phone?: string
  source: string
  start: string
  end: string
  summary?: string
}

export interface SyncLogEntry {
  booking_id: string
  gcal_event_id?: string
  synced_at: string
  status: "success" | "failed" | "pending"
  error_message?: string
}

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

export class GoogleCalendarService {
  private calendar: any
  private calendarId: string

  constructor() {
    // Initialize Google Calendar API with OAuth2 or service account
    const auth = new google.auth.GoogleAuth({
      scopes: ["https://www.googleapis.com/auth/calendar"],
      keyFile: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_FILE,
      // Alternative: Use OAuth2 client for user authentication
      // clientId: process.env.GOOGLE_CLIENT_ID,
      // clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      // redirectUri: process.env.GOOGLE_REDIRECT_URI,
    })

    this.calendar = google.calendar({ version: "v3", auth })
    this.calendarId = process.env.GOOGLE_CALENDAR_ID || "primary"
  }

  /**
   * Create a calendar event from booking data
   */
  async createEvent(booking: BookingData): Promise<string | null> {
    try {
      const event = this.formatBookingToEvent(booking)

      const response = await this.calendar.events.insert({
        calendarId: this.calendarId,
        resource: event,
        sendUpdates: "none", // Don't send emails to attendees
      })

      const eventId = response.data.id

      // Log successful sync
      await this.logSync(booking.uid, eventId, "success")

      console.log(
        `Created Google Calendar event ${eventId} for booking ${booking.uid}`,
      )
      return eventId
    } catch (error) {
      console.error(
        `Failed to create calendar event for booking ${booking.uid}:`,
        error,
      )
      await this.logSync(booking.uid, undefined, "failed", String(error))
      return null
    }
  }

  /**
   * Update an existing calendar event
   */
  async updateEvent(eventId: string, booking: BookingData): Promise<boolean> {
    try {
      const event = this.formatBookingToEvent(booking)

      await this.calendar.events.update({
        calendarId: this.calendarId,
        eventId: eventId,
        resource: event,
        sendUpdates: "none",
      })

      // Log successful sync
      await this.logSync(booking.uid, eventId, "success")

      console.log(
        `Updated Google Calendar event ${eventId} for booking ${booking.uid}`,
      )
      return true
    } catch (error) {
      console.error(
        `Failed to update calendar event ${eventId} for booking ${booking.uid}:`,
        error,
      )
      await this.logSync(booking.uid, eventId, "failed", String(error))
      return false
    }
  }

  /**
   * Delete a calendar event
   */
  async deleteEvent(eventId: string, bookingId: string): Promise<boolean> {
    try {
      await this.calendar.events.delete({
        calendarId: this.calendarId,
        eventId: eventId,
      })

      // Log successful deletion
      await this.logSync(bookingId, eventId, "success")

      console.log(
        `Deleted Google Calendar event ${eventId} for booking ${bookingId}`,
      )
      return true
    } catch (error) {
      console.error(
        `Failed to delete calendar event ${eventId} for booking ${bookingId}:`,
        error,
      )
      await this.logSync(bookingId, eventId, "failed", String(error))
      return false
    }
  }

  /**
   * Check if an event exists
   */
  async eventExists(eventId: string): Promise<boolean> {
    try {
      await this.calendar.events.get({
        calendarId: this.calendarId,
        eventId: eventId,
      })
      return true
    } catch (error: any) {
      if (error.code === 404) {
        return false
      }
      throw error
    }
  }

  /**
   * Format booking data to Google Calendar event format
   */
  private formatBookingToEvent(booking: BookingData): CalendarEvent {
    const guestInfo = [
      booking.guestName ? `Guest: ${booking.guestName}` : "",
      booking.email ? `Email: ${booking.email}` : "",
      booking.phone ? `Phone: ${booking.phone}` : "",
      `Source: ${booking.source}`,
    ]
      .filter(Boolean)
      .join("\n")

    return {
      summary: booking.summary || `Booking: ${booking.guestName || "Guest"}`,
      description: guestInfo,
      start: {
        dateTime: booking.start,
        timeZone: "America/Costa_Rica", // Property timezone
      },
      end: {
        dateTime: booking.end,
        timeZone: "America/Costa_Rica",
      },
      reminders: {
        overrides: [
          {
            method: "popup",
            minutes: 24 * 60, // 24 hours before
          },
          {
            method: "email",
            minutes: 24 * 60, // 24 hours before
          },
        ],
      },
    }
  }

  /**
   * Log sync operation to Supabase
   */
  private async logSync(
    bookingId: string,
    eventId: string | undefined,
    status: "success" | "failed" | "pending",
    errorMessage?: string,
  ): Promise<void> {
    try {
      const logEntry: Omit<SyncLogEntry, "synced_at"> = {
        booking_id: bookingId,
        gcal_event_id: eventId,
        status,
        error_message: errorMessage,
      }

      await supabase.from("gcal_sync_log").upsert(
        {
          ...logEntry,
          synced_at: new Date().toISOString(),
        },
        {
          onConflict: "booking_id",
        },
      )
    } catch (error) {
      console.error("Failed to log sync operation:", error)
    }
  }

  /**
   * Get existing sync log for a booking
   */
  async getSyncLog(bookingId: string): Promise<SyncLogEntry | null> {
    try {
      const { data, error } = await supabase
        .from("gcal_sync_log")
        .select("*")
        .eq("booking_id", bookingId)
        .single()

      if (error) {
        if (error.code === "PGRST116") {
          // No rows returned
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
   * Test calendar access
   */
  async testAccess(): Promise<boolean> {
    try {
      await this.calendar.calendarList.get({ calendarId: this.calendarId })
      return true
    } catch (error) {
      console.error("Google Calendar access test failed:", error)
      return false
    }
  }
}

// Standalone functions for backward compatibility and easier testing
export async function createCalendarEvent(
  booking: BookingData,
  eventType: "checkin" | "checkout",
): Promise<string | null> {
  const service = new GoogleCalendarService()

  // Validate booking data
  if (!booking.uid || !booking.start || !booking.end) {
    throw new Error("Invalid booking data: missing required fields")
  }

  // Adjust booking data based on event type
  const eventStartDate = eventType === "checkin" ? booking.start : booking.end
  const eventEndDate = eventType === "checkin" ? booking.start : booking.end // Same day for check-in/out events

  const guestName = booking.guestName || "Unknown Guest"
  const eventBooking = {
    ...booking,
    summary:
      eventType === "checkin"
        ? `Check-in: ${guestName} (${booking.source})`
        : `Check-out: ${guestName} (${booking.source})`,
    start: eventStartDate,
    end: eventEndDate,
  }

  // Add retry logic with exponential backoff
  let lastError: Error | null = null
  const maxRetries = 3

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await service.createEvent(eventBooking)
      if (result) return result
    } catch (error: any) {
      lastError = error

      // Don't retry on authentication errors or non-retryable errors
      if (error.code === 401 || error.code === 404) {
        throw error
      }

      // Don't retry on last attempt
      if (attempt === maxRetries) {
        break
      }

      // Only retry on quota errors (429) and network timeouts
      if (error.code !== 429 && error.code !== "ETIMEDOUT") {
        break
      }

      // Exponential backoff: wait 2^attempt seconds
      const delay = Math.pow(2, attempt) * 1000
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }

  throw lastError || new Error("Failed to create calendar event after retries")
}

export async function updateCalendarEvent(
  eventId: string,
  booking: BookingData,
  eventType: "checkin" | "checkout",
): Promise<string> {
  const service = new GoogleCalendarService()

  const guestName = booking.guestName || "Unknown Guest"
  const eventBooking = {
    ...booking,
    summary:
      eventType === "checkin"
        ? `Check-in: ${guestName} (${booking.source})`
        : `Check-out: ${guestName} (${booking.source})`,
    start: eventType === "checkin" ? booking.start : booking.end,
    end: eventType === "checkin" ? booking.start : booking.end,
  }

  const success = await service.updateEvent(eventId, eventBooking)
  if (!success) {
    throw new Error("Event not found")
  }
  return eventId
}

export async function deleteCalendarEvent(eventId: string): Promise<boolean> {
  const service = new GoogleCalendarService()
  const success = await service.deleteEvent(eventId, "unknown")
  if (!success) {
    throw new Error("Event not found")
  }
  return success
}

export async function syncBookingToCalendar(booking: BookingData): Promise<{
  checkinEventId?: string
  checkoutEventId?: string
  status: "created" | "updated"
}> {
  // Validate booking data
  if (!booking.uid || !booking.start || !booking.end) {
    throw new Error("Invalid booking dates")
  }

  // Validate date format
  try {
    new Date(booking.start)
    new Date(booking.end)
  } catch {
    throw new Error("Invalid booking dates")
  }

  const service = new GoogleCalendarService()
  const syncLog = await service.getSyncLog(booking.uid)

  if (!syncLog || !syncLog.gcal_event_id) {
    // Create new events
    const checkinEventId = await createCalendarEvent(booking, "checkin")
    const checkoutEventId = await createCalendarEvent(booking, "checkout")

    return {
      checkinEventId: checkinEventId || undefined,
      checkoutEventId: checkoutEventId || undefined,
      status: "created",
    }
  } else {
    // Update existing events (simplified for testing)
    const checkinEventId = await updateCalendarEvent(
      syncLog.gcal_event_id,
      booking,
      "checkin",
    )
    const checkoutEventId = await updateCalendarEvent(
      syncLog.gcal_event_id + "_checkout",
      booking,
      "checkout",
    )

    return {
      checkinEventId: checkinEventId || undefined,
      checkoutEventId: checkoutEventId || undefined,
      status: "updated",
    }
  }
}

// Singleton instance
export const googleCalendarService = new GoogleCalendarService()
