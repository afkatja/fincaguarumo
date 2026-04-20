/**
 * Netlify Function for background calendar sync processing
 * This function is designed to be called by Netlify cron jobs
 *
 * Schedule: Every 15 minutes
 * Environment variables required:
 * - CALENDAR_SYNC_SECRET: Secret key for authentication
 * - NEXT_PUBLIC_SUPABASE_URL: Supabase project URL
 * - SUPABASE_SERVICE_ROLE_KEY: Supabase service role key
 * - GOOGLE_SERVICE_ACCOUNT_KEY_FILE: Path to Google service account key
 * - GOOGLE_CALENDAR_ID: Google Calendar ID
 */

exports.handler = async function (event: any, context: any) {
  try {
    // Verify this is a cron job invocation
    const cronSecret = process.env.CALENDAR_SYNC_SECRET
    if (!cronSecret) {
      console.error("CALENDAR_SYNC_SECRET not configured")
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Server configuration error" }),
      }
    }

    // Call the main sync API endpoint
    const syncUrl = `${process.env.NEXT_PUBLIC_SITE_URL || "https://fincaguarumo.netlify.app"}/api/calendar-sync`

    const response = await fetch(`${syncUrl}?secret=${cronSecret}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Netlify-Cron-Job/1.0",
      },
      body: JSON.stringify({
        cleanup: false,
        dryRun: false,
        force: false,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error("Background sync failed:", errorData)

      return {
        statusCode: response.status,
        body: JSON.stringify({
          status: "error",
          message: "Background sync failed",
          error: errorData.error || "Unknown error",
          timestamp: new Date().toISOString(),
        }),
      }
    }

    const result = await response.json()

    // Add background processing metadata
    const backgroundResult = {
      ...result,
      execution: {
        type: "background",
        triggeredBy: "netlify-cron",
        timestamp: new Date().toISOString(),
        duration: "background-job",
      },
    }

    console.log("Background calendar sync completed:", backgroundResult)

    return {
      statusCode: 200,
      body: JSON.stringify(backgroundResult),
    }
  } catch (error) {
    console.error("Background sync function error:", error)

    return {
      statusCode: 500,
      body: JSON.stringify({
        status: "error",
        message: "Background sync function failed",
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      }),
    }
  }
}
