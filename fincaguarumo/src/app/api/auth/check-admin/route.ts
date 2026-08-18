import { NextResponse } from "next/server"
import { verifyUserAuth } from "@/lib/auth"

export async function POST(request: Request) {
  try {
    const authUser = await verifyUserAuth(request)

    return NextResponse.json({ isAdmin: authUser.is_admin }, { status: 200 })
  } catch (error: any) {
    if (error.status === 401) {
      return NextResponse.json({ isAdmin: false }, { status: 200 })
    }
    if (error.status === 403) {
      return NextResponse.json({ isAdmin: false }, { status: 200 })
    }
    console.error("Admin check error:", error)
    return NextResponse.json({ isAdmin: false }, { status: 500 })
  }
}