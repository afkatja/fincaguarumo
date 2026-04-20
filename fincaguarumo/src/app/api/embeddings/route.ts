import { NextRequest, NextResponse } from "next/server"
import {
  generateEmbedding,
  generateBatchEmbeddings,
  storeEmbedding,
  storeBatchEmbeddings,
  embeddingExists,
  validateEmbedding,
  getEmbeddingDimensions,
} from "@/lib/semantic-rag/embeddings"
import { verifyAdminAuth } from "@/lib/auth"

// Rate limiting (simple in-memory for demo)
export const rateLimitMap = new Map<
  string,
  { count: number; resetTime: number }
>()
const RATE_LIMIT_WINDOW = 60000 // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 50 // More restrictive for embeddings API

function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for")
  const real = request.headers.get("x-real-ip")
  return forwarded?.split(",")[0] || real || "unknown"
}

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const record = rateLimitMap.get(ip)

  if (!record || now > record.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW })
    return true
  }

  if (record.count >= RATE_LIMIT_MAX_REQUESTS) {
    return false
  }

  record.count++
  return true
}

function checkAdminToken(request: NextRequest): boolean {
  const adminToken = request.headers.get("x-admin-token")
  const expectedToken = process.env.ADMIN_TOKEN

  if (!expectedToken) {
    // If no ADMIN_TOKEN is set, don't allow token-based auth
    return false
  }

  return adminToken === expectedToken
}

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const clientIP = getClientIP(request)
    if (!checkRateLimit(clientIP)) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 },
      )
    }

    const body = await request.json()
    const { action, ...data } = body

    // Authentication and authorization checks
    const isAdminTokenValid = checkAdminToken(request)
    let isAdminUser = false

    // Only verify admin auth for sensitive actions
    if (["store", "storeBatch", "exists"].includes(action)) {
      try {
        // Try admin token first (for server-to-server calls)
        if (isAdminTokenValid) {
          isAdminUser = true
        } else {
          // Fall back to Supabase auth
          await verifyAdminAuth(request)
          isAdminUser = true
        }
      } catch (error: any) {
        return NextResponse.json(
          { error: error.message || "Admin access required" },
          { status: error.status || 401 },
        )
      }
    }
    // For safe actions (generate, generateBatch, validate), allow public access
    // but with stricter rate limiting

    switch (action) {
      case "generate": {
        const { text } = data
        if (!text || typeof text !== "string") {
          return NextResponse.json(
            { error: "Text is required and must be a string" },
            { status: 400 },
          )
        }

        const result = await generateEmbedding(text)
        return NextResponse.json(result)
      }

      case "generateBatch": {
        const { texts } = data
        if (!Array.isArray(texts) || texts.length === 0) {
          return NextResponse.json(
            { error: "Texts must be a non-empty array" },
            { status: 400 },
          )
        }

        const results = await generateBatchEmbeddings(texts)
        return NextResponse.json({ embeddings: results })
      }

      case "store": {
        // Admin-only action
        if (!isAdminUser) {
          return NextResponse.json(
            { error: "Admin access required for store operations" },
            { status: 403 },
          )
        }
        const {
          contentId,
          contentType,
          language,
          content,
          embedding,
          metadata,
        } = data

        if (!contentId || !contentType || !language || !content || !embedding) {
          return NextResponse.json(
            {
              error:
                "contentId, contentType, language, content, and embedding are required",
            },
            { status: 400 },
          )
        }

        if (!validateEmbedding(embedding)) {
          return NextResponse.json(
            {
              error: `Invalid embedding format. Expected ${getEmbeddingDimensions()} dimensions`,
            },
            { status: 400 },
          )
        }

        await storeEmbedding(
          contentId,
          contentType,
          language,
          content,
          embedding,
          metadata,
        )
        return NextResponse.json({ success: true })
      }

      case "storeBatch": {
        // Admin-only action
        if (!isAdminUser) {
          return NextResponse.json(
            { error: "Admin access required for batch store operations" },
            { status: 403 },
          )
        }
        const { embeddings: batchEmbeddings } = data

        if (!Array.isArray(batchEmbeddings) || batchEmbeddings.length === 0) {
          return NextResponse.json(
            { error: "Embeddings must be a non-empty array" },
            { status: 400 },
          )
        }

        // Validate each embedding in the batch
        for (const emb of batchEmbeddings) {
          if (
            !emb.contentId ||
            !emb.contentType ||
            !emb.language ||
            !emb.content ||
            !emb.embedding
          ) {
            return NextResponse.json(
              {
                error:
                  "Each embedding must have contentId, contentType, language, content, and embedding",
              },
              { status: 400 },
            )
          }
          if (!validateEmbedding(emb.embedding)) {
            return NextResponse.json(
              {
                error: `Invalid embedding format. Expected ${getEmbeddingDimensions()} dimensions`,
              },
              { status: 400 },
            )
          }
        }

        await storeBatchEmbeddings(batchEmbeddings)
        return NextResponse.json({ success: true })
      }

      case "exists": {
        // Admin-only action (can reveal information about stored embeddings)
        if (!isAdminUser) {
          return NextResponse.json(
            { error: "Admin access required for existence checks" },
            { status: 403 },
          )
        }
        const { contentId, contentType } = data

        if (!contentId || !contentType) {
          return NextResponse.json(
            { error: "contentId and contentType are required" },
            { status: 400 },
          )
        }

        const exists = await embeddingExists(contentId, contentType)
        return NextResponse.json({ exists })
      }

      case "validate": {
        const { embedding } = data

        if (!embedding) {
          return NextResponse.json(
            { error: "Embedding is required" },
            { status: 400 },
          )
        }

        const isValid = validateEmbedding(embedding)
        return NextResponse.json({
          valid: isValid,
          expectedDimensions: getEmbeddingDimensions(),
          actualDimensions: embedding.length,
        })
      }

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 },
        )
    }
  } catch (error) {
    console.error("Embeddings API error:", error)
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

export async function GET() {
  try {
    return NextResponse.json({
      model: "intfloat/e5-base-instruct",
      dimensions: getEmbeddingDimensions(),
      endpoint: "/api/embeddings",
      actions: [
        "generate - Generate embedding for single text",
        "generateBatch - Generate embeddings for multiple texts",
        "store - Store single embedding",
        "storeBatch - Store multiple embeddings",
        "exists - Check if embedding exists",
        "validate - Validate embedding format",
      ],
    })
  } catch (error) {
    console.error("Embeddings GET error:", error)
    return NextResponse.json(
      { error: "Failed to get embeddings info" },
      { status: 500 },
    )
  }
}
