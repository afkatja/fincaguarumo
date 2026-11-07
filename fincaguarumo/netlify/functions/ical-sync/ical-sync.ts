import { Context } from "@netlify/functions"

export default async (request: Request, context: Context) => {
  try {
    const CRON_SECRET = process.env.CALENDAR_SYNC_SECRET

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
      console.error("Unauthorized iCal sync attempt")
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    const siteUrl = process.env.URL || "https://fincaguarumo.netlify.app"
    const syncUrl = `${siteUrl}/api/ical/merged?force=true&secret=${CRON_SECRET}`

    const apiResponse = await fetch(syncUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    })

    const result = await apiResponse.json()

    if (!apiResponse.ok) {
      console.error("iCal sync API call failed:", result)
      return Response.json(
        { error: "iCal sync API call failed", details: result },
        { status: apiResponse.status },
      )
    }

    const functionResponse = {
      status: "success",
      message: "iCal sync completed",
      data: {
        bookingsCount: result.bookings?.length || 0,
        mergedCount: result.merged?.length || 0,
        completedAt: new Date().toISOString(),
        requestId: context.requestId,
      },
    }

    console.log("iCal sync completed successfully:", functionResponse.data)

    return Response.json(functionResponse, { status: 200 })
  } catch (error) {
    console.error("iCal sync cron error:", error)

    return Response.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}