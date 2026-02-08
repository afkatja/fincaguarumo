import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_API_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

/**
 * GET: Fetch unavailable dates for calendar display
 * This endpoint provides the same data that availability checking uses
 */
export async function GET() {
  try {
    // First, ensure we have the latest data by triggering the iCal sync
    try {
      const siteUrl =
        process.env.NEXT_PUBLIC_SITE_URL ||
        (process.env.VERCEL_URL
          ? `https://${process.env.VERCEL_URL}`
          : "http://localhost:3000")
      
      // Trigger sync in the background, don't wait for it
      fetch(`${siteUrl}/api/ical/merged`, {
        method: "GET",
      }).catch(syncError => {
        console.error("Background sync failed:", syncError)
      })
    } catch (syncError) {
      console.error("Error triggering sync:", syncError)
      // Continue anyway - we'll return what we have
    }

    // Fetch all unavailable ranges from availability table
    const { data: availabilityData, error: availabilityError } = await supabase
      .from("availability")
      .select("start_date, end_date")
      .eq("is_available", false)
      .gte("end_date", new Date().toISOString()) // Only future/present dates
      .order("start_date", { ascending: true })

    if (availabilityError) {
      console.error("Error fetching availability data:", availabilityError)
      return NextResponse.json({ error: availabilityError.message }, { status: 500 })
    }

    // Also check bookings table as fallback for any missing availability entries
    const { data: bookingsData, error: bookingsError } = await supabase
      .from("bookings")
      .select("check_in, check_out")
      .gte("check_out", new Date().toISOString()) // Only future/present dates
      .order("check_in", { ascending: true })

    if (bookingsError) {
      console.error("Error fetching bookings data:", bookingsError)
    }

    // Convert availability data to blocked dates format
    const blockedDates: Date[] = []
    
    // Process availability table data
    if (availabilityData) {
      for (const range of availabilityData) {
        const start = new Date(range.start_date)
        const end = new Date(range.end_date)
        
        // Add all dates in the range to blocked dates
        const currentDate = new Date(start)
        while (currentDate < end) {
          blockedDates.push(new Date(currentDate))
          currentDate.setDate(currentDate.getDate() + 1)
        }
      }
    }

    // Process bookings table data as fallback
    if (bookingsData) {
      for (const booking of bookingsData) {
        const start = new Date(booking.check_in)
        const end = new Date(booking.check_out)
        
        // Add all dates in the range to blocked dates
        const currentDate = new Date(start)
        while (currentDate < end) {
          // Check if date is already in blockedDates to avoid duplicates
          const dateStr = currentDate.toISOString().split('T')[0]
          if (!blockedDates.some(date => date.toISOString().split('T')[0] === dateStr)) {
            blockedDates.push(new Date(currentDate))
          }
          currentDate.setDate(currentDate.getDate() + 1)
        }
      }
    }

    // Sort blocked dates
    blockedDates.sort((a, b) => a.getTime() - b.getTime())

    // Return in the same format as the original iCal merged endpoint
    const mergedRanges = availabilityData?.map(range => ({
      start: range.start_date,
      end: range.end_date,
      blocked: [] // We'll populate this if needed
    })) || []

    return NextResponse.json({
      blockedDates: blockedDates.map(date => date.toISOString()),
      merged: mergedRanges,
      source: "availability-table"
    })

  } catch (error) {
    console.error("Error in calendar availability endpoint:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}
