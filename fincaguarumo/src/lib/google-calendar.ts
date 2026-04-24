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

// Constants
const CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar"
const CALENDAR_VERSION = "v3"
const TIMEZONE = "America/Costa_Rica"
const ALERT_MINUTES = 24 * 60 // 24 hours
const DEFAULT_CALENDAR_ID = "primary"

// Timezone utilities
function formatDateTimeForCalendar(dateString: string): string {
  const date = new Date(dateString)
  // Ensure the date is formatted in Costa Rica timezone
  return date.toISOString()
}

function validateTimezone(timezone: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: timezone })
    return true
  } catch {
    return false
  }
}

export class GoogleCalendarService {
  private calendar: any
  private calendarId: string

  constructor() {
    const auth = new google.auth.GoogleAuth({
      scopes: [CALENDAR_SCOPE],
      keyFile: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_FILE,
    })

    this.calendar = google.calendar({ version: CALENDAR_VERSION, auth })
    this.calendarId = process.env.GOOGLE_CALENDAR_ID || DEFAULT_CALENDAR_ID
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
      throw error
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
      throw error
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
      throw error
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
    // Validate timezone before using it
    const validTimezone = validateTimezone(TIMEZONE) ? TIMEZONE : "UTC"

    return {
      summary: this.getEventSummary(booking),
      description: this.formatGuestInfo(booking),
      start: {
        dateTime: formatDateTimeForCalendar(booking.start),
        timeZone: validTimezone,
      },
      end: {
        dateTime: formatDateTimeForCalendar(booking.end),
        timeZone: validTimezone,
      },
      reminders: this.createReminders(),
    }
  }

  private getEventSummary(booking: BookingData): string {
    return booking.summary || `Booking: ${booking.guestName || "Guest"}`
  }

  private formatGuestInfo(booking: BookingData): string {
    const guestInfo = [
      booking.guestName && `Guest: ${booking.guestName}`,
      booking.email && `Email: ${booking.email}`,
      booking.phone && `Phone: ${booking.phone}`,
      `Source: ${booking.source}`,
    ].filter(Boolean)

    return guestInfo.join("\n")
  }

  private createReminders() {
    return {
      useDefault: false,
      overrides: [
        { method: "popup" as const, minutes: ALERT_MINUTES },
        { method: "email" as const, minutes: ALERT_MINUTES },
      ],
    } as any
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
      // Test direct calendar access instead of calendarList
      await this.calendar.events.list({
        calendarId: this.calendarId,
        maxResults: 1,
      })
      return true
    } catch (error) {
      console.error("Google Calendar access test failed:", error)
      return false
    }
  }
}

// Helper functions
function createEventBooking(
  booking: BookingData,
  eventType: "checkin" | "checkout",
): BookingData {
  const eventDate = eventType === "checkin" ? booking.start : booking.end
  const guestName = booking.guestName || "Unknown Guest"
  const eventLabel = eventType === "checkin" ? "Check-in" : "Check-out"

  return {
    ...booking,
    summary: `${eventLabel}: ${guestName} (${booking.source})`,
    start: eventDate,
    end: eventDate,
  }
}

function validateBookingData(booking: BookingData): void {
  if (!booking.uid || !booking.start || !booking.end) {
    throw new Error("Invalid booking data: missing required fields")
  }
}

async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
): Promise<T> {
  let lastError: Error | null = null

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation()
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

  throw lastError || new Error("Operation failed after retries")
}

// Standalone functions for backward compatibility and easier testing
export async function createCalendarEvent(
  booking: BookingData,
): Promise<string | null> {
  const service = new GoogleCalendarService()
  validateBookingData(booking)

  return await retryWithBackoff(async () => {
    const result = await service.createEvent(booking)
    if (!result) {
      throw new Error("Failed to create calendar event")
    }
    return result
  })
}

export async function updateCalendarEvent(
  eventId: string,
  booking: BookingData,
): Promise<string> {
  const service = new GoogleCalendarService()

  return await retryWithBackoff(async () => {
    const success = await service.updateEvent(eventId, booking)
    if (!success) {
      throw new Error(`Failed to update calendar event ${eventId}`)
    }
    return eventId
  })
}

export async function deleteCalendarEvent(eventId: string): Promise<boolean> {
  const service = new GoogleCalendarService()

  return await retryWithBackoff(async () => {
    const success = await service.deleteEvent(eventId, "unknown")
    if (!success) {
      throw new Error(`Failed to delete calendar event ${eventId}`)
    }
    return true
  })
}

function validateBookingDates(booking: BookingData): void {
  if (!booking.uid || !booking.start || !booking.end) {
    throw new Error("Invalid booking dates")
  }

  // Validate date format
  const start = new Date(booking.start)
  const end = new Date(booking.end)

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    throw new Error("Invalid booking dates")
  }
}

export async function syncBookingToCalendar(booking: BookingData): Promise<{
  eventId?: string
  status: "created" | "updated"
}> {
  validateBookingDates(booking)

  const service = new GoogleCalendarService()
  const syncLog = await service.getSyncLog(booking.uid)

  if (!syncLog || !syncLog.gcal_event_id) {
    // Create new event
    const eventId = await createCalendarEvent(booking)

    return {
      eventId: eventId || undefined,
      status: "created",
    }
  } else {
    // Update existing event using real ID
    const eventId = syncLog.gcal_event_id

    if (!eventId) {
      throw new Error("Missing event ID for update")
    }

    // Update existing event
    const updatedEventId = await updateCalendarEvent(eventId, booking)

    return {
      eventId: updatedEventId,
      status: "updated",
    }
  }
}

// Singleton instance
export const googleCalendarService = new GoogleCalendarService()
