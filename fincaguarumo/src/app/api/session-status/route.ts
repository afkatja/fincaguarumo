import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"

const stripe = new Stripe(process.env.STRIPE_API_KEY!)

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const session_id = searchParams.get("session_id")
  if (!session_id) {
    return NextResponse.json({ error: "Missing session_id" }, { status: 400 })
  }
  try {
    const session = await stripe.checkout.sessions.retrieve(session_id)
    return NextResponse.json({ session })
  } catch (error) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 })
  }
}
