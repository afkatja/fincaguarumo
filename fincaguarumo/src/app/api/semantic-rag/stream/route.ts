/**
 * Semantic RAG Progress Stream (SSE)
 *
 * Provides Server-Sent Events for real-time progress updates
 * on long-running RAG operations.
 */

import { NextRequest } from "next/server"

// In-memory job storage (matches main route.ts)
interface JobStatus {
  id: string
  status: "pending" | "running" | "completed" | "failed"
  progress: number
  total: number
  currentTask: string
  message: string
  error?: string
  result?: unknown
  startedAt: string
  completedAt?: string
}

const jobs = new Map<string, JobStatus>()

/**
 * GET /api/semantic-rag/stream - SSE for job progress
 */
export async function GET(request: NextRequest) {
  const jobId = request.nextUrl.searchParams.get("jobId")

  if (!jobId) {
    return new Response("Missing jobId parameter", { status: 400 })
  }

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    start(controller) {
      // Send initial connection message
      controller.enqueue(
        encoder.encode(`event: connected\ndata: {"jobId":"${jobId}"}\n\n`),
      )

      // Poll for job updates
      const pollInterval = setInterval(() => {
        const job = jobs.get(jobId)

        if (!job) {
          controller.enqueue(
            encoder.encode(`event: error\ndata: {"error":"Job not found"}\n\n`),
          )
          controller.close()
          clearInterval(pollInterval)
          return
        }

        // Send progress update
        const eventData = JSON.stringify({
          id: job.id,
          status: job.status,
          progress: job.progress,
          total: job.total,
          currentTask: job.currentTask,
          message: job.message,
          error: job.error,
          result: job.status === "completed" ? job.result : undefined,
        })

        if (job.status === "running" || job.status === "pending") {
          controller.enqueue(
            encoder.encode(`event: progress\ndata: ${eventData}\n\n`),
          )
        } else {
          // Job completed or failed - send final event
          controller.enqueue(
            encoder.encode(`event: ${job.status}\ndata: ${eventData}\n\n`),
          )
          controller.close()
          clearInterval(pollInterval)
        }
      }, 1000) // Poll every second

      // Cleanup on close
      request.signal.addEventListener("abort", () => {
        clearInterval(pollInterval)
        try {
          controller.close()
        } catch {
          // Already closed
        }
      })
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no", // Disable nginx buffering
    },
  })
}

// Export job storage for use by main route
export { jobs }
