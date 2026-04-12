#!/usr/bin/env node

/**
 * Test script for Supabase booking flow starting from line 169 in webhook
 * This simulates the exact data structure and operations from the Stripe webhook
 */

import { createClient } from "@supabase/supabase-js"
import { parsePropertyDate } from "./src/lib/dateUtils"
import type { BookingType } from "./src/types"

// Test data matching the webhook structure
const testMetadata = {
  customerName: "Test Customer",
  customerEmail: "test@example.com",
  customerPhone: "+1234567890",
  type: "villa" as BookingType,
  title: "Villa Test Booking",
  description: "Test booking for Supabase flow",
  duration: 3,
  location: "Test Location",
  body: "Test body",
  date: "2024-12-15",
  checkIn: "2024-12-15",
  checkOut: "2024-12-18",
  price: "300",
  totalPrice: "900",
  currency: "usd",
  guests: "2",
  geo: JSON.stringify({ lat: 10.123, lng: -84.456 }),
}

const testEventId = "cs_test_" + Date.now()

// Replicate the exact booking details structure from webhook
const bookingDetails = {
  type: (testMetadata.type as BookingType) || "villa",
  title: testMetadata.title || "",
  description: testMetadata.description || "",
  duration: Number(testMetadata.duration) || 0,
  location: testMetadata.location || "",
  body: testMetadata.body || "",
  date: parsePropertyDate(testMetadata.date || ""),
  checkIn: parsePropertyDate(testMetadata.checkIn || ""),
  checkOut: parsePropertyDate(testMetadata.checkOut || ""),
  price: Number(testMetadata.price) || 0,
  basePrice: Number(testMetadata.price) || 0,
  totalPrice: Number(testMetadata.totalPrice) || 0,
  currency: testMetadata.currency || "usd",
  guests: Number(testMetadata.guests) || 0,
  geo: testMetadata.geo ? JSON.parse(testMetadata.geo) : {},
}

// Replicate the exact customer details structure from webhook
const customerDetails = {
  name: testMetadata.customerName || "",
  email: testMetadata.customerEmail || "",
  phoneNumber: testMetadata.customerPhone || "",
}

async function testSupabaseFlow() {
  console.log("🧪 Starting Supabase flow test...")
  console.log("📋 Test data:", {
    customerDetails,
    bookingDetails: {
      ...bookingDetails,
      checkIn: bookingDetails.checkIn?.toISOString(),
      checkOut: bookingDetails.checkOut?.toISOString(),
    },
    eventId: testEventId,
  })

  // Validate environment variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl) {
    console.error(
      "❌ NEXT_PUBLIC_SUPABASE_URL environment variable is required",
    )
    process.exit(1)
  }

  if (!supabaseServiceKey) {
    console.error(
      "❌ SUPABASE_SERVICE_ROLE_KEY environment variable is required",
    )
    process.exit(1)
  }

  // Create Supabase admin client (same as createSupabaseAdmin())
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  // Validate dates before proceeding (same logic as webhook)
  const checkInValid =
    bookingDetails.checkIn && !isNaN(bookingDetails.checkIn.getTime())
  const checkOutValid =
    bookingDetails.checkOut && !isNaN(bookingDetails.checkOut.getTime())

  if (!checkInValid || !checkOutValid) {
    console.error("❌ Invalid dates in booking details:", {
      checkIn: bookingDetails.checkIn,
      checkOut: bookingDetails.checkOut,
      checkInValid,
      checkOutValid,
    })
    process.exit(1)
  }

  let bookingSaved = false
  let availabilityUpdated = false

  try {
    console.log("💾 Attempting to save booking to Supabase...")

    // Save to Supabase with all required fields (exact same as webhook lines 175-188)
    const { data: bookingData, error: bookingError } = await supabaseAdmin
      .from("bookings")
      .insert({
        check_in: bookingDetails.checkIn.toISOString(),
        check_out: bookingDetails.checkOut.toISOString(),
        guest_name: customerDetails.name,
        email: customerDetails.email,
        phone: customerDetails.phoneNumber,
        source: "direct",
        uid: testEventId,
        guests: bookingDetails.guests,
        booking_type: bookingDetails.type,
        total_price: bookingDetails.totalPrice,
        currency: bookingDetails.currency,
      })

    console.log("📊 Booking insert result:", { bookingData, bookingError })

    if (bookingData) {
      bookingSaved = true
      console.log("✅ Booking saved to Supabase successfully")

      // Also update availability table to mark dates as unavailable (same as webhook lines 195-211)
      try {
        console.log("📅 Attempting to update availability...")

        // Double-check dates before using them for availability
        const availabilityCheckIn = bookingDetails.checkIn.toISOString()
        const availabilityCheckOut = bookingDetails.checkOut.toISOString()

        const { error: availabilityError } = await supabaseAdmin
          .from("availability")
          .insert({
            start_date: availabilityCheckIn,
            end_date: availabilityCheckOut,
            is_available: false,
            reason: `Booked via Direct - ${customerDetails.name}`,
            booking_uid: testEventId,
            updated_at: new Date().toISOString(),
          })

        console.log("📊 Availability insert result:", { availabilityError })

        if (!availabilityError) {
          availabilityUpdated = true
          console.log("✅ Availability updated successfully")
        } else {
          console.error("❌ Failed to update availability:", availabilityError)
        }
      } catch (availabilityError) {
        console.error("❌ Error updating availability:", availabilityError)
      }
    } else {
      console.error("❌ Failed to save booking to Supabase:", bookingError)
    }
  } catch (supabaseError) {
    console.error("❌ Error saving booking to Supabase:", supabaseError)
  }

  // Summary (same as webhook lines 242-261)
  console.log("\n📋 Test Results Summary:")
  console.log(`- Booking Saved: ${bookingSaved ? "✅" : "❌"}`)
  console.log(`- Availability Updated: ${availabilityUpdated ? "✅" : "❌"}`)

  if (bookingSaved && availabilityUpdated) {
    console.log("🎉 Complete success!")
  } else {
    const failedOperations = []
    if (!bookingSaved) failedOperations.push("Supabase booking save")
    if (!availabilityUpdated) failedOperations.push("availability update")

    console.log(
      `⚠️  Partial or complete failure - Failed operations: ${failedOperations.join(", ")}`,
    )
  }

  // Cleanup test data
  console.log("\n🧹 Cleaning up test data...")
  try {
    if (bookingSaved) {
      const { error: deleteBookingError } = await supabaseAdmin
        .from("bookings")
        .delete()
        .eq("uid", testEventId)

      if (deleteBookingError) {
        console.error("❌ Failed to delete test booking:", deleteBookingError)
      } else {
        console.log("✅ Test booking deleted")
      }
    }

    if (availabilityUpdated) {
      const { error: deleteAvailabilityError } = await supabaseAdmin
        .from("availability")
        .delete()
        .eq("booking_uid", testEventId)

      if (deleteAvailabilityError) {
        console.error(
          "❌ Failed to delete test availability:",
          deleteAvailabilityError,
        )
      } else {
        console.log("✅ Test availability deleted")
      }
    }
  } catch (cleanupError) {
    console.error("❌ Error during cleanup:", cleanupError)
  }

  console.log("\n🏁 Test completed!")
}

// Run the test
testSupabaseFlow().catch(console.error)
