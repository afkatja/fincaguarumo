/**
 * Semantic RAG Management API
 *
 * Provides endpoints for RAG initialization, validation, and rebuilding
 * with support for:
 * - Timeout handling for long operations (Netlify 10s limit)
 * - Progress streaming via Server-Sent Events (SSE)
 * - Background job tracking
 */

import { NextRequest, NextResponse } from "next/server"
import {
  rebuildAllEmbeddings,
  getSemanticRAGStats,
  validateSemanticRAGSetup,
} from "@/lib/semantic-rag/semantic-context-builder"

// In-memory job storage (would use Redis/database in production)
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
const MAX_JOBS = 10
const SUPPORTED_LANGUAGES = ["en", "es", "de", "nl", "ru"]

/**
 * Generate a unique job ID
 */
function generateJobId(): string {
  return `rag-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
}

/**
 * Clean up old jobs
 */
function cleanupOldJobs(): void {
  if (jobs.size > MAX_JOBS) {
    const oldestKeys = Array.from(jobs.keys()).slice(0, jobs.size - MAX_JOBS)
    oldestKeys.forEach(key => jobs.delete(key))
  }
}

/**
 * Create a new job
 */
function createJob(id: string, task: string): JobStatus {
  cleanupOldJobs()
  const job: JobStatus = {
    id,
    status: "pending",
    progress: 0,
    total: 100,
    currentTask: task,
    message: "Job created",
    startedAt: new Date().toISOString(),
  }
  jobs.set(id, job)
  return job
}

/**
 * Update job progress
 */
function updateJobProgress(
  jobId: string,
  progress: number,
  total: number,
  currentTask: string,
  message: string,
): void {
  const job = jobs.get(jobId)
  if (job) {
    job.progress = progress
    job.total = total
    job.currentTask = currentTask
    job.message = message
    if (job.status === "pending") {
      job.status = "running"
    }
  }
}

/**
 * Complete job successfully
 */
function completeJob(jobId: string, result: unknown): void {
  const job = jobs.get(jobId)
  if (job) {
    job.status = "completed"
    job.progress = 100
    job.result = result
    job.message = "Job completed successfully"
    job.completedAt = new Date().toISOString()
  }
}

/**
 * Fail job with error
 */
function failJob(jobId: string, error: string): void {
  const job = jobs.get(jobId)
  if (job) {
    job.status = "failed"
    job.error = error
    job.message = "Job failed"
    job.completedAt = new Date().toISOString()
  }
}

/**
 * GET /api/semantic-rag - Get RAG system status and stats
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const action = searchParams.get("action")
    const jobId = searchParams.get("jobId")

    // Get job status
    if (jobId) {
      const job = jobs.get(jobId)
      if (!job) {
        return NextResponse.json({ error: "Job not found" }, { status: 404 })
      }
      return NextResponse.json(job)
    }

    // Default: get stats
    const stats = await getSemanticRAGStats()
    const validation = await validateSemanticRAGSetup()

    return NextResponse.json({
      status: "ok",
      stats,
      validation: {
        isValid: validation.isValid,
        errors: validation.errors,
        warnings: validation.warnings,
      },
      activeJobs: Array.from(jobs.values())
        .filter(j => j.status === "running" || j.status === "pending")
        .map(j => ({ id: j.id, task: j.currentTask, status: j.status })),
    })
  } catch (error) {
    console.error("Semantic RAG GET error:", error)
    return NextResponse.json(
      {
        error: "Failed to get RAG status",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

/**
 * POST /api/semantic-rag - Execute RAG management actions
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, languages } = body

    switch (action) {
      case "validate": {
        // Quick validation - runs synchronously
        console.log("🔍 Running RAG validation...")
        const validation = await validateSemanticRAGSetup()

        return NextResponse.json({
          success: true,
          validation,
        })
      }

      case "init": {
        // Initialize all embeddings - async with progress
        const jobId = generateJobId()
        const job = createJob(jobId, "Initialize all embeddings")

        // Start background job (don't await - let it run in background)
        runInitJob(jobId, languages).catch(error => {
          console.error("Init job failed:", error)
          failJob(
            jobId,
            error instanceof Error ? error.message : "Unknown error",
          )
        })

        return NextResponse.json({
          success: true,
          jobId,
          message:
            "Initialization started. Use /api/semantic-rag?jobId=<id> to track progress.",
          sseUrl: `/api/semantic-rag/stream?jobId=${jobId}`,
        })
      }

      case "rebuild": {
        // Rebuild specific language embeddings - async with progress
        const targetLanguages = languages || ["en"]

        // Validate languages
        const invalidLangs = targetLanguages.filter(
          (l: string) => !SUPPORTED_LANGUAGES.includes(l),
        )
        if (invalidLangs.length > 0) {
          return NextResponse.json(
            {
              error: `Invalid languages: ${invalidLangs.join(", ")}. Supported: ${SUPPORTED_LANGUAGES.join(", ")}`,
            },
            { status: 400 },
          )
        }

        const jobId = generateJobId()
        const job = createJob(
          jobId,
          `Rebuild ${targetLanguages.join(", ")} embeddings`,
        )

        // Start background job
        runRebuildJob(jobId, targetLanguages).catch(error => {
          console.error("Rebuild job failed:", error)
          failJob(
            jobId,
            error instanceof Error ? error.message : "Unknown error",
          )
        })

        return NextResponse.json({
          success: true,
          jobId,
          message: `Rebuild started for: ${targetLanguages.join(", ")}. Use /api/semantic-rag?jobId=<id> to track progress.`,
          sseUrl: `/api/semantic-rag/stream?jobId=${jobId}`,
        })
      }

      case "status": {
        // Quick status check
        const stats = await getSemanticRAGStats()
        return NextResponse.json({
          success: true,
          stats,
        })
      }

      default:
        return NextResponse.json(
          {
            error: `Unknown action: ${action}. Valid actions: validate, init, rebuild, status`,
          },
          { status: 400 },
        )
    }
  } catch (error) {
    console.error("Semantic RAG POST error:", error)
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

/**
 * Run initialization job in background
 */
async function runInitJob(jobId: string, languages?: string[]): Promise<void> {
  const targetLanguages = languages || SUPPORTED_LANGUAGES
  const totalSteps = targetLanguages.length + 2 // languages + validation + final stats
  let currentStep = 0

  try {
    // Step 1: Validate setup
    updateJobProgress(
      jobId,
      Math.round((currentStep / totalSteps) * 100),
      totalSteps,
      "Validating setup",
      "Validating RAG setup...",
    )
    currentStep++

    await validateSemanticRAGSetup()

    // Step 2-3: Process each language
    for (let i = 0; i < targetLanguages.length; i++) {
      const language = targetLanguages[i]
      updateJobProgress(
        jobId,
        Math.round((currentStep / totalSteps) * 100),
        totalSteps,
        `Processing ${language}`,
        `Rebuilding embeddings for ${language}...`,
      )

      await rebuildAllEmbeddings(language)
      currentStep++
    }

    // Final stats
    updateJobProgress(
      jobId,
      95,
      100,
      "Getting final stats",
      "Retrieving final statistics...",
    )
    const finalStats = await getSemanticRAGStats()

    completeJob(jobId, finalStats)
  } catch (error) {
    console.error("Init job error:", error)
    failJob(jobId, error instanceof Error ? error.message : "Unknown error")
  }
}

/**
 * Run rebuild job in background
 */
async function runRebuildJob(
  jobId: string,
  languages: string[],
): Promise<void> {
  const totalSteps = languages.length + 1 // languages + final stats
  let currentStep = 0

  try {
    for (let i = 0; i < languages.length; i++) {
      const language = languages[i]
      updateJobProgress(
        jobId,
        Math.round((currentStep / totalSteps) * 100),
        totalSteps,
        `Processing ${language}`,
        `Rebuilding embeddings for ${language}...`,
      )

      await rebuildAllEmbeddings(language)
      currentStep++
    }

    // Final stats
    updateJobProgress(
      jobId,
      95,
      100,
      "Getting final stats",
      "Retrieving final statistics...",
    )
    const finalStats = await getSemanticRAGStats()

    completeJob(jobId, finalStats)
  } catch (error) {
    console.error("Rebuild job error:", error)
    failJob(jobId, error instanceof Error ? error.message : "Unknown error")
  }
}
