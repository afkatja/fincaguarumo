/**
 * API route for batch semantic RAG processing
 * Uses Together AI batch API for cost optimization
 */

import { NextRequest, NextResponse } from "next/server"
import {
  submitBatchRAGJob,
  getBatchJob,
  getBatchJobStats,
} from "@/lib/semantic-rag/batch-api"
import { getTokenBudget } from "@/lib/semantic-rag/token-utils"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { queries, pageContext, options = {} } = body

    // Validate input
    if (!queries || !Array.isArray(queries) || queries.length === 0) {
      return NextResponse.json(
        { error: "queries must be a non-empty array" },
        { status: 400 },
      )
    }

    if (!pageContext || !pageContext.locale) {
      return NextResponse.json(
        { error: "pageContext with locale is required" },
        { status: 400 },
      )
    }

    // Set cost-optimized defaults
    const optimizedOptions = {
      modelRole: options.modelRole || "primary",
      maxTokens: getTokenBudget(options.modelRole || "primary"),
      includeMetadata: false, // Reduce noise by default
      useMultiStep: false, // Reduce complexity for batch processing
      ...options,
    }

    // Submit batch job
    const jobId = await submitBatchRAGJob(
      queries,
      pageContext,
      optimizedOptions,
    )

    return NextResponse.json({
      success: true,
      jobId,
      message: "Batch job submitted successfully",
      estimatedQueries: queries.length,
      tokenBudget: optimizedOptions.maxTokens,
    })
  } catch (error) {
    console.error("Batch submission error:", error)
    return NextResponse.json(
      {
        error: "Failed to submit batch job",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const jobId = searchParams.get("jobId")

    if (jobId) {
      // Get specific job status
      const job = await getBatchJob(jobId)

      if (!job) {
        return NextResponse.json({ error: "Job not found" }, { status: 404 })
      }

      return NextResponse.json({
        success: true,
        job: {
          id: job.id,
          status: job.status,
          createdAt: job.createdAt,
          queryCount: job.queries.length,
          result: job.result,
          error: job.error,
        },
      })
    } else {
      // Get batch job statistics
      const stats = await getBatchJobStats()

      return NextResponse.json({
        success: true,
        stats,
        tokenBudgets: {
          tools: getTokenBudget("tools"),
          fast: getTokenBudget("fast"),
          primary: getTokenBudget("primary"),
          evaluation: getTokenBudget("evaluation"),
        },
      })
    }
  } catch (error) {
    console.error("Batch status error:", error)
    return NextResponse.json(
      {
        error: "Failed to get batch status",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
