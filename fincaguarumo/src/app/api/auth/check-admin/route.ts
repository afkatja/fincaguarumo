import { NextResponse } from "next/server"
import { createSupabaseAdmin } from "@/lib/auth"

export async function POST(request: Request) {
  try {
    const { userId } = await request.json()

    if (!userId) {
      return NextResponse.json(
        { error: "userId is required", isAdmin: false },
        { status: 400 },
      )
    }

    const supabaseAdmin = createSupabaseAdmin()

    const { data: userData, error } = await supabaseAdmin
      .from("users")
      .select("is_admin")
      .eq("id", userId)
      .single()

    if (error || !userData) {
      return NextResponse.json({ isAdmin: false }, { status: 200 })
    }

    return NextResponse.json({ isAdmin: userData.is_admin }, { status: 200 })
  } catch (error) {
    console.error("Admin check error:", error)
    return NextResponse.json({ isAdmin: false }, { status: 500 })
  }
}