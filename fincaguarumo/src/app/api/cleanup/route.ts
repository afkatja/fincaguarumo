import {
  findAndDeleteDuplicates,
  fixMalformedSlugs,
} from "../../../../scripts/cleanup"
import { NextResponse } from "next/server"

// In your Sanity Studio or via API
export async function GET() {
  console.log("🔧 Starting cleanup process...")

  // First fix malformed slugs
  await fixMalformedSlugs()

  // Then delete duplicates
  await findAndDeleteDuplicates()

  console.log("🎉 Cleanup completed!")

  return NextResponse.json({ success: true })
}
