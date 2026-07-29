// Netlify function handler for calendar sync
// Note: This function will be deployed to Netlify and has access to the same codebase

// Environment variables required
const CRON_SECRET = process.env.CALENDAR_SYNC_SECRET

interface NetlifyEvent {
  queryStringParameters?: {
    secret?: string
  }
  headers?: {
    [key: string]: string
  }
}

interface NetlifyContext {
  awsRequestId: string
}

const handler = async (event: NetlifyEvent, context: NetlifyContext) => {
  try {
    console.log("Calendar sync cron job triggered", {
      requestId: context.awsRequestId,
      timestamp: new Date().toISOString(),
    })

    // Validate cron secret
    // Check headers first (for scheduled Netlify cron triggers)
    // Fall back to query parameters (for manual/legacy calls)
    const headerSecret = event.headers?.["x-calendar-sync-secret"]
    const querySecret = event.queryStringParameters?.secret
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
      return {
        statusCode: 401,
        body: JSON.stringify({ error: "Unauthorized" }),
      }
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
      return {
        statusCode: apiResponse.status,
        body: JSON.stringify(result),
      }
    }

    const functionResponse = {
      status: "success",
      message: "Calendar sync completed",
      data: {
        sync: result.data?.sync || result,
        completedAt: new Date().toISOString(),
        requestId: context.awsRequestId,
      },
    }

    console.log("Calendar sync completed successfully:", functionResponse.data)

    return {
      statusCode: 200,
      body: JSON.stringify(functionResponse),
    }
  } catch (error) {
    console.error("Calendar sync cron error:", error)

    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
        requestId: context.awsRequestId,
      }),
    }
  }
}

export { handler }
