// app/api/bookings/route.ts
import { NextResponse } from "next/server"
import { client } from "../../../sanity/lib/client"

export async function POST(req: Request) {
  const { checkIn, checkOut, guestName, source, uid } = await req.json()

  const booking = await client.create({
    _type: "booking",
    checkIn,
    checkOut,
    guestName,
    source,
    uid,
  })

  return NextResponse.json({ success: true, booking })
}
