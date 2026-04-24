import { config } from "dotenv"
import { google } from "googleapis"

// Load environment variables
config()

async function testCalendarEventCreation() {
  try {
    console.log("Testing calendar event creation...")

    // Initialize auth
    const auth = new google.auth.GoogleAuth({
      scopes: ["https://www.googleapis.com/auth/calendar"],
      keyFile: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_FILE,
    })

    const calendar = google.calendar({ version: "v3", auth })
    const calendarId = process.env.GOOGLE_CALENDAR_ID

    if (!calendarId) {
      throw new Error("GOOGLE_CALENDAR_ID not set")
    }

    // Create test event
    const testEvent = {
      summary: "Test Booking Event",
      description: "Guest: Test Guest\nEmail: test@example.com\nSource: test",
      start: {
        dateTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        timeZone: "America/Costa_Rica",
      },
      end: {
        dateTime: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
        timeZone: "America/Costa_Rica",
      },
      reminders: {
        useDefault: false,
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
      } as any,
    }

    console.log("Creating event in calendar:", calendarId)
    const response = await calendar.events.insert({
      calendarId: calendarId,
      ...testEvent,
      sendUpdates: "none",
    })

    console.log("Event created successfully:", response.data.id)
    console.log("Event link:", response.data.htmlLink)

    // Clean up - delete the test event
    if (response.data.id) {
      await calendar.events.delete({
        calendarId: calendarId,
        eventId: response.data.id,
      })
      console.log("Test event cleaned up")
    }
  } catch (error: any) {
    console.error("Event creation failed:", error.message)
    if (error.code) console.error("Error code:", error.code)
  }
}

testCalendarEventCreation()
