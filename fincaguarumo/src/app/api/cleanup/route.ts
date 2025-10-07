import {
  findAndDeleteDuplicates,
  fixMalformedSlugs,
  forceDeleteDocumentById,
} from "../../../../scripts/cleanup"
import { NextRequest, NextResponse } from "next/server"

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
