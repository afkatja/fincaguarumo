import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

export async function POST(request: Request) {
  const { checkIn, checkOut } = await request.json()

  // Fetch availability data from Supabase
  const { data, error } = await supabase
    .from("availability")
    .select("*")
    .overlaps("start_date", `${checkIn},${checkOut}`)
    .or(
      `and(is_available.eq(false),end_date.gte.${checkIn}),and(is_available.eq(false),start_date.lte.${checkOut})`,
    )

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Check if the requested date range is available
  const isAvailable =
    data.length === 0 || data.every(entry => entry.is_available)

  return NextResponse.json({ isAvailable })
}
