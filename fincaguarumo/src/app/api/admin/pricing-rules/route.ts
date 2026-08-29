import { NextResponse } from "next/server"
import { verifyAdminAuth } from "@/lib/auth"
import { sanityFetch } from "@/sanity/lib/client"
import { ALL_PRICING_RULES_QUERY } from "@/sanity/lib/queries"

export async function GET(request: Request) {
  try {
    await verifyAdminAuth(request)

    const pricingRules = await sanityFetch({
      query: ALL_PRICING_RULES_QUERY,
      revalidate: 60,
      tags: ["pricing-rules"],
    })

    return NextResponse.json({
      status: "success",
      data: pricingRules,
    })
  } catch (error: any) {
    if (error.status === 401) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      )
    }
    if (error.status === 403) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 },
      )
    }

    console.error("Failed to fetch pricing rules:", error)
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

export async function PUT() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 })
}

export async function DELETE() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 })
}

export async function PATCH() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 })
}