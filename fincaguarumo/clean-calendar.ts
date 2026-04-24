#!/usr/bin/env tsx

import { config } from "dotenv"
import { google } from "googleapis"
import { createClient } from "@supabase/supabase-js"
import { isTestBooking } from "./src/lib/testBookingDetection"

// Load environment variables
config()

interface CleanupOptions {
  mode: "test-only" | "bookings-only" | "all"
  dryRun?: boolean
}

function printUsage() {
  console.log(`
Usage: npx tsx clean-calendar.ts [options]

Options:
  --test-only     Delete only test bookings (detected by patterns)
  --bookings-only  Delete only booking-related events (not all events)
  --all           Delete all events (default)
  --dry-run       Show what would be deleted without actually deleting

Examples:
  npx tsx clean-calendar.ts --test-only     # Delete only test bookings
  npx tsx clean-calendar.ts --bookings-only # Delete only booking events
  npx tsx clean-calendar.ts --all           # Delete all events
  npx tsx clean-calendar.ts --test-only --dry-run # Preview test deletions
`)
}

async function initializeCalendar() {
  const auth = new google.auth.GoogleAuth({
    scopes: ["https://www.googleapis.com/auth/calendar"],
    keyFile: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_FILE,
  })

  const calendar = google.calendar({ version: "v3", auth })
  const calendarId = process.env.GOOGLE_CALENDAR_ID

  if (!calendarId) {
    throw new Error("GOOGLE_CALENDAR_ID not set")
  }

  return { calendar, calendarId }
}

async function fetchAllEvents(calendar: any, calendarId: string) {
  console.log("Fetching all events from calendar...")
  const response = await calendar.events.list({
    calendarId: calendarId,
    timeMin: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // Last 30 days
    timeMax: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // Next year
    singleEvents: true,
    orderBy: "startTime",
  })

  return response.data.items || []
}

function filterTestEvents(events: any[]) {
  console.log("Identifying test events in calendar...")
  return events.filter(event => {
    // Extract guest information from event summary and description
    const summary = event.summary || ""
    const description = event.description || ""

    // Try to extract guest name from summary (common format: "Check-in: Guest Name (source)")
    let guestName = ""
    let email = ""
    let uid = ""

    // Extract from summary like "Check-in: Joe Doe (direct)" or "Check-out: Jane Doe (airbnb)"
    const summaryMatch = summary.match(/(?:Check-in|Check-out):\s*([^()]+)/)
    if (summaryMatch) {
      guestName = summaryMatch[1].trim()
    }

    // Extract from description if available
    if (description) {
      const emailMatch = description.match(/Email:\s*([^\s]+)/)
      if (emailMatch) {
        email = emailMatch[1]
      }

      // Look for UID in description or extended properties
      const uidMatch =
        description.match(/UID:\s*([^\s]+)/) ||
        description.match(/Booking ID:\s*([^\s]+)/)
      if (uidMatch) {
        uid = uidMatch[1]
      }
    }

    // Check extended properties for UID
    if (!uid && event.extendedProperties?.private?.sanity_uid) {
      uid = event.extendedProperties.private.sanity_uid
    }

    // Use the same test detection logic as the booking system
    const isTest = isTestBooking(
      uid || event.id || "",
      guestName || summary,
      email,
    )

    if (isTest) {
      console.log(
        `Detected test event: ${summary} (UID: ${uid || event.id}, Guest: ${guestName})`,
      )
    }

    return isTest
  })
}

function filterBookingEvents(events: any[]) {
  return events.filter(
    event =>
      event.summary?.includes("Booking:") ||
      event.summary?.includes("Check-in:") ||
      event.summary?.includes("Check-out:") ||
      event.description?.includes("Guest:") ||
      event.description?.includes("Source:"),
  )
}

function showEvents(events: any[], mode: string) {
  if (events.length === 0) {
    console.log(`No ${mode} events found to delete`)
    return
  }

  console.log(
    `\n${mode.charAt(0).toUpperCase() + mode.slice(1)} events to be deleted:`,
  )
  events.forEach((event, index) => {
    console.log(`${index + 1}. ${event.summary} (${event.id})`)
    console.log(`   Start: ${event.start?.dateTime}`)
    console.log(`   End: ${event.end?.dateTime}`)
  })
}

async function deleteEvents(
  calendar: any,
  calendarId: string,
  events: any[],
  dryRun: boolean,
) {
  if (events.length === 0) return { deletedCount: 0, errorCount: 0 }

  if (dryRun) {
    console.log(`\nDRY RUN: Would delete ${events.length} events`)
    return { deletedCount: events.length, errorCount: 0 }
  }

  console.log(`\nProceeding with deletion in 10 seconds (Ctrl+C to cancel)...`)
  await new Promise(resolve => setTimeout(resolve, 10000))

  let deletedCount = 0
  let errorCount = 0

  for (const event of events) {
    try {
      await calendar.events.delete({
        calendarId: calendarId,
        eventId: event.id!,
      })
      console.log(`Deleted: ${event.summary}`)
      deletedCount++
    } catch (error) {
      console.error(`Failed to delete ${event.summary}:`, error)
      errorCount++
    }
  }

  return { deletedCount, errorCount }
}

async function clearSyncLogs(mode: string, eventIds: string[] = []) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    console.log("\nCleaning up Supabase sync logs...")

    if (mode === "test-only" && eventIds.length > 0) {
      // Delete specific sync logs for test events
      console.log(`Deleting sync logs for ${eventIds.length} test events...`)

      const { error } = await supabase
        .from("gcal_sync_log")
        .delete()
        .in("gcal_event_id", eventIds)

      if (error) {
        console.error("Failed to delete test sync logs:", error)
      } else {
        console.log(
          `Successfully deleted sync logs for ${eventIds.length} test events`,
        )
      }
    } else if (mode === "bookings-only" || mode === "all") {
      // Delete all booking-related sync logs
      console.log(`Deleting all booking-related sync logs...`)

      const { error } = await supabase
        .from("gcal_sync_log")
        .delete()
        .not("booking_id", "is", null)

      if (error) {
        console.error("Failed to delete booking sync logs:", error)
        console.log("Manual cleanup required:")
        console.log("DELETE FROM gcal_sync_log WHERE booking_id IS NOT NULL;")
      } else {
        console.log("Successfully deleted all booking-related sync logs")
      }
    }

    if (mode === "all") {
      // For complete cleanup, also clear old logs
      console.log("Cleaning up old sync logs (older than 90 days)...")

      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - 90)

      const { error } = await supabase
        .from("gcal_sync_log")
        .delete()
        .lt("synced_at", cutoffDate.toISOString())

      if (error) {
        console.error("Failed to clean up old sync logs:", error)
      } else {
        console.log("Successfully cleaned up old sync logs")
      }
    }
  } catch (error) {
    console.error("Failed to clean up sync logs:", error)
    console.log("Manual cleanup may be required:")
    console.log(
      "DELETE FROM gcal_sync_log WHERE synced_at < NOW() - INTERVAL '90 days';",
    )
  }
}

async function cleanCalendar(options: CleanupOptions) {
  try {
    const { calendar, calendarId } = await initializeCalendar()
    const allEvents = await fetchAllEvents(calendar, calendarId)

    console.log(`Found ${allEvents.length} total events in calendar`)

    let eventsToDelete: any[] = []
    let modeDescription = ""

    switch (options.mode) {
      case "test-only":
        eventsToDelete = filterTestEvents(allEvents)
        modeDescription = "test"
        break
      case "bookings-only":
        eventsToDelete = filterBookingEvents(allEvents)
        modeDescription = "booking-related"
        break
      case "all":
        eventsToDelete = allEvents
        modeDescription = "all"
        break
    }

    console.log(
      `Found ${eventsToDelete.length} ${modeDescription} events to process`,
    )

    showEvents(eventsToDelete, modeDescription)

    const { deletedCount, errorCount } = await deleteEvents(
      calendar,
      calendarId,
      eventsToDelete,
      options.dryRun || false,
    )

    console.log(`\nCleanup completed:`)
    console.log(`- Successfully deleted: ${deletedCount} events`)
    console.log(`- Failed to delete: ${errorCount} events`)

    // Clean up sync logs with appropriate event IDs (only when not in dry run)
    if (!options.dryRun) {
      const eventIds = eventsToDelete.map(event => event.id).filter(Boolean)
      await clearSyncLogs(options.mode, eventIds)
    }

    console.log(
      `\n${options.dryRun ? "DRY RUN COMPLETED" : "CALENDAR CLEANUP COMPLETED"}!`,
    )
  } catch (error: any) {
    console.error("Calendar cleanup failed:", error.message)
    if (error.code) console.error("Error code:", error.code)
    process.exit(1)
  }
}

function parseArguments(): CleanupOptions {
  const args = process.argv.slice(2)

  if (args.includes("--help") || args.includes("-h")) {
    printUsage()
    process.exit(0)
  }

  const dryRun = args.includes("--dry-run")
  const testOnly = args.includes("--test-only")
  const bookingsOnly = args.includes("--bookings-only")
  const all = args.includes("--all") || (!testOnly && !bookingsOnly)

  let mode: CleanupOptions["mode"] = "all"

  if (testOnly) mode = "test-only"
  else if (bookingsOnly) mode = "bookings-only"
  else if (all) mode = "all"

  return { mode, dryRun }
}

async function main() {
  const options = parseArguments()

  console.log(
    `Calendar Cleanup Tool - Mode: ${options.mode}${options.dryRun ? " (DRY RUN)" : ""}`,
  )
  console.log("=====================================")

  await cleanCalendar(options)
}

main()
