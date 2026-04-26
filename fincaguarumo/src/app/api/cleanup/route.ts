import {
  findAndDeleteDuplicates,
  fixMalformedSlugs,
  forceDeleteDocumentById,
} from "../../../../scripts/cleanup"
import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    // Check for admin secret header
    const adminSecret = request.headers.get("x-admin-secret")
    const expectedSecret = process.env.ADMIN_SECRET

    if (!adminSecret || adminSecret !== expectedSecret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log("🔧 Starting cleanup process...")
    await fixMalformedSlugs()
    await findAndDeleteDuplicates()
    console.log("🎉 Cleanup completed!")

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Cleanup failed:", error)
    return NextResponse.json(
      { error: error.message || "Cleanup failed" },
      { status: 500 },
    )
  }
}

export async function GET(request: NextRequest) {
  const docId = new URLSearchParams(request.url).get("docId")
  if (docId) {
    await forceDeleteDocumentById(docId)
    return NextResponse.json({ success: true })
  }
  console.log("🔧 Starting cleanup process...")
  await fixMalformedSlugs()
  await findAndDeleteDuplicates()
  console.log("🎉 Cleanup completed!")
  return NextResponse.json({ success: true })
}
