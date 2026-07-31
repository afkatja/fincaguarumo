import { Context } from "@netlify/functions"
// Netlify function handler for calendar sync
// Note: This function will be deployed to Netlify and has access to the same codebase

// Environment variables required

export default async (request: Request, context: Context) => {
  try {
    const CRON_SECRET = process.env.CALENDAR_SYNC_SECRET
    // Validate cron secret
    // Check headers first (for scheduled Netlify cron triggers)
    // Fall back to query parameters (for manual/legacy calls)
    const url = new URL(request.url)
    const headerSecret = request.headers?.get("x-calendar-sync-secret")
    const querySecret = url.searchParams.get("secret")
    const secret = headerSecret || querySecret

    if (!CRON_SECRET) {
      console.error("CALENDAR_SYNC_SECRET environment variable is missing")
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Server configuration error" }),
      }
    }
    if (secret !== CRON_SECRET) {
      console.error("Unauthorized calendar sync attempt")
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Call API route to perform sync
    const siteUrl = process.env.URL || "https://fincaguarumo.netlify.app"
    const syncUrl = `${siteUrl}/api/calendar-sync?secret=${CRON_SECRET}`

    const apiResponse = await fetch(syncUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        cleanup: new Date().getDay() === 0 && new Date().getHours() === 2, // Sunday 2 AM
      }),
    })

    const result = await apiResponse.json()

    if (!apiResponse.ok) {
      console.error("Calendar sync API call failed:", result)
      return Response.json(
        { error: "Calendar sync API call failed", details: result },
        { status: apiResponse.status },
      )
    }

    const functionResponse = {
      status: "success",
      message: "Calendar sync completed",
      data: {
        sync: result.data?.sync || result,
        completedAt: new Date().toISOString(),
        requestId: context.requestId,
      },
    }

    console.log("Calendar sync completed successfully:", functionResponse.data)

    return Response.json(functionResponse, { status: 200 })
  } catch (error) {
    console.error("Calendar sync cron error:", error)

    return Response.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
