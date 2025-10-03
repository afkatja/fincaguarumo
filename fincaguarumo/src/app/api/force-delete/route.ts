import { forceDeleteDocumentById } from "../../../../scripts/cleanup"
import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { docId } = await request.json()

    if (!docId) {
      return NextResponse.json(
        { error: "Document ID is required" },
        { status: 400 }
      )
    }

    console.log(`Force deleting document: ${docId}`)
    await forceDeleteDocumentById(docId)

    return NextResponse.json({
      success: true,
      message: `Successfully force deleted document: ${docId}`,
    })
  } catch (error: any) {
    console.error("Force delete failed:", error)
    return NextResponse.json(
      { error: error.message || "Force delete failed" },
      { status: 500 }
    )
  }
}
