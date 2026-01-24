import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

export async function POST(request: Request) {
  const bookingData = await request.json()

  // Insert booking data into Supabase
  const { data, error } = await supabase
    .from("bookings")
    .insert([
      {
        check_in: bookingData.checkIn,
        check_out: bookingData.checkOut,
        guest_name: bookingData.guestName,
        source: bookingData.source || "Direct",
        uid: bookingData.uid,
      },
    ])
    .select()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

export async function GET() {
  // Fetch all bookings from Supabase
  const { data, error } = await supabase.from("bookings").select("*")

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}
