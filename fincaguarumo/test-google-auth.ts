import { google } from "googleapis"
import { readFileSync } from "fs"
import { config } from "dotenv"

// Load environment variables from .env file
config()

async function testGoogleAuth() {
  try {
    console.log("Testing Google Calendar authentication...")

    // Test 1: Check if service account file exists
    const keyFile = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_FILE

    if (!keyFile) {
      console.error("GOOGLE_SERVICE_ACCOUNT_KEY_FILE not set")
      return
    }

    console.log("Key file path:", keyFile)

    // Test 2: Try to read the key file
    try {
      const keyContent = readFileSync(keyFile, "utf8")
      const key = JSON.parse(keyContent)
      console.log("Key file readable, client email:", key.client_email)
    } catch (error) {
      console.error("Cannot read key file:", error)
      return
    }

    // Test 3: Initialize auth and test access
    const auth = new google.auth.GoogleAuth({
      scopes: ["https://www.googleapis.com/auth/calendar"],
      keyFile: keyFile,
    })

    const calendar = google.calendar({ version: "v3", auth })
    const calendarId = process.env.GOOGLE_CALENDAR_ID

    console.log("Testing calendar access with ID:", calendarId)

    // Test 4: Try to access calendar events directly
    try {
      const events = await calendar.events.list({
        calendarId,
        timeMin: new Date().toISOString(),
        maxResults: 5,
      })
      console.log(
        "Calendar events accessible, found:",
        events.data.items?.length,
      )
      console.log("Calendar summary:", events.data.summary)

      // Test 5: Try to get calendar info
      const calendarData = await calendar.calendars.get({ calendarId })
      console.log("Calendar accessible:", calendarData.data.summary)
    } catch (error: any) {
      console.error("Calendar access failed:", error.message)
      if (error.code) console.error("Error code:", error.code)
    }

    console.log("✅ Authentication successful")
  } catch (error: any) {
    console.error("❌ Authentication failed:", error.message)
    if (error.code) console.error("Error code:", error.code)
    if (error.status) console.error("HTTP status:", error.status)
  }
}

testGoogleAuth()
