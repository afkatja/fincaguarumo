import { NextResponse } from "next/server"
import { verifyAdminAuth } from "@/lib/auth"
import { googleCalendarService } from "@/lib/google-calendar"

/**
 * Admin-only calendar connection test endpoint
 * Requires admin authentication via JWT token
 */
export async function GET(request: Request) {
  try {
    // Verify admin authentication
    const adminUser = await verifyAdminAuth(request)
    console.log(`Admin ${adminUser.email} testing calendar connection`)

    // Test calendar access
    const hasAccess = await googleCalendarService.testAccess()

    return NextResponse.json({
      status: "success",
      hasAccess,
      calendarId: process.env.GOOGLE_CALENDAR_ID || "primary",
      testedBy: adminUser.email,
    })
  } catch (error: any) {
    console.error("Admin calendar connection test error:", error)

    // Handle auth errors specifically
    if (error.status === 401) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      )
    }
    if (error.status === 403) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 },
      )
    }

    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

// Handle unsupported methods
export async function POST() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 })
}

export async function PUT() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 })
}

export async function DELETE() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 })
}

export async function PATCH() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 })
}
