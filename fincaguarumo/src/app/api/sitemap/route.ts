import { NextRequest, NextResponse } from "next/server"
import { generateSitemap } from "../../../lib/generateSiteMap"

export async function GET(req: NextRequest) {
  try {
    const sitemap = await generateSitemap()

    const response = new NextResponse(sitemap, {
      headers: { "Content-Type": "application/xml" },
      status: 200,
    })
    return response
  } catch (error) {
    console.log("sitemap error:", error)

    return NextResponse.json(
      { error: "Failed to generate sitemap" },
      { status: 500 }
    )
  }
}
