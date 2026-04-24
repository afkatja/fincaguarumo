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
import {
  validateEmbeddingText,
  validateEmbeddingBatchText,
  validateInput,
  INPUT_LIMITS,
  validateApiRequest,
} from "@/lib/input-validation"
import { embeddingsRateLimiter } from "@/lib/rate-limiting/redis-rate-limit"

// Allowed content types to prevent data exfiltration and system probing
const ALLOWED_CONTENT_TYPES = [
  "faq",
  "page",
  "tour",
  "review",
  "post",
  "home",
  "amenity",
  "pricing_rule",
  "payment_method",
  "cancellation_policy",
  "logistics",
  "article",
  "multilingual-test",
  "test-type",
] as const

function isValidContentType(
  contentType: string,
): contentType is (typeof ALLOWED_CONTENT_TYPES)[number] {
  return ALLOWED_CONTENT_TYPES.includes(
    contentType as (typeof ALLOWED_CONTENT_TYPES)[number],
  )
}

const MAX_BATCH_SIZE = 100 // Maximum batch size to match TogetherAI internal BATCH_SIZE
const MAX_REQUEST_SIZE = 10 * 1024 * 1024 // 10MB maximum request size
const MAX_JSON_DEPTH = 10 // Maximum JSON parsing depth to prevent stack overflow

function validateRequestSize(request: NextRequest): {
  valid: boolean
  error?: string
} {
  const contentLength = request.headers.get("content-length")

  if (contentLength) {
    const size = parseInt(contentLength, 10)
    if (isNaN(size) || size < 0) {
      return { valid: false, error: "Invalid Content-Length header" }
    }
    if (size > MAX_REQUEST_SIZE) {
      return {
        valid: false,
        error: `Request too large. Maximum size is ${MAX_REQUEST_SIZE / 1024 / 1024}MB`,
      }
    }
  } else {
    // If no Content-Length header, we'll need to check the actual body size
    // This is less efficient but provides a fallback
    return { valid: true }
  }

  return { valid: true }
}

function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for")
  const real = request.headers.get("x-real-ip")

  // Only trust x-forwarded-for when running behind a trusted proxy
  const isTrustedProxy =
    process.env.VERCEL === "1" ||
    process.env.NETLIFY === "true" ||
    process.env.TRUSTED_PROXY === "true"

  if (isTrustedProxy && forwarded) {
    return forwarded.split(",")[0].trim()
  }

  // Fall back to x-real-ip or unknown
  return real || "unknown"
}

async function checkRateLimit(
  ip: string,
): Promise<{ allowed: boolean; resetTime: number }> {
  try {
    const result = await embeddingsRateLimiter.checkLimit(ip)
    return {
      allowed: result.allowed,
      resetTime: result.resetTime,
    }
  } catch (error) {
    console.error("Rate limiting error:", error)
    // Fail open: allow request if rate limiting fails
    return {
      allowed: true,
      resetTime: Date.now() + 60000,
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    // Early request size validation to prevent DoS attacks
    const sizeValidation = validateRequestSize(request)
    if (!sizeValidation.valid) {
      return NextResponse.json(
        { error: sizeValidation.error },
        { status: 413 }, // Request Entity Too Large
      )
    }

    // Rate limiting with Redis-based distributed rate limiting
    const clientIP = getClientIP(request)
    const rateLimitResult = await checkRateLimit(clientIP)
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        {
          error: "Too many requests. Please try again later.",
          resetTime: rateLimitResult.resetTime,
        },
        {
          status: 429,
          headers: {
            "X-RateLimit-Reset": rateLimitResult.resetTime.toString(),
            "Retry-After": Math.ceil(
              (rateLimitResult.resetTime - Date.now()) / 1000,
            ).toString(),
          },
        },
      )
    }

    let body
    try {
      // Parse JSON with size limits and depth restrictions
      const text = await request.text()

      // Additional size check for actual body content
      if (text.length > MAX_REQUEST_SIZE) {
        return NextResponse.json(
          {
            error: `Request too large. Maximum size is ${MAX_REQUEST_SIZE / 1024 / 1024}MB`,
          },
          { status: 413 },
        )
      }

      // Safe JSON parsing with depth and prototype protection
      const parseStack: number[] = []
      body = JSON.parse(text, (key, value) => {
        // Track actual nesting depth using a stack approach
        if (typeof value === "object" && value !== null) {
          if (key === "") {
            // Root object - reset stack
            parseStack.length = 0
            parseStack.push(1)
          } else {
            // Nested object/array - check parent depth
            const parentDepth = parseStack[parseStack.length - 1] || 0
            if (parentDepth > MAX_JSON_DEPTH) {
              throw new Error(
                `JSON depth exceeds maximum allowed depth of ${MAX_JSON_DEPTH}`,
              )
            }
            parseStack.push(parentDepth + 1)
          }
        } else if (key !== "") {
          // Primitive value, pop the depth stack
          parseStack.pop()
        }

        // Prevent prototype pollution
        if (
          typeof key === "string" &&
          (key === "__proto__" || key === "constructor" || key === "prototype")
        ) {
          return undefined
        }
        return value
      })
    } catch (parseError) {
      let errorMessage = "Invalid JSON in request body"
      let statusCode = 400

      if (
        parseError instanceof Error &&
        parseError.message.includes("JSON depth exceeds")
      ) {
        errorMessage = parseError.message
        statusCode = 413 // Request Entity Too Large for depth violations
      }

      return NextResponse.json({ error: errorMessage }, { status: statusCode })
    }
    const { action, ...data } = body

    // Authentication and authorization checks
    let isAdminUser = false

    // Only verify admin auth for sensitive actions
    if (["store", "storeBatch", "exists"].includes(action)) {
      try {
        // Enforce JWT-only verification for admin access
        await verifyAdminAuth(request)
        isAdminUser = true
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

        // Validate text input with strict limits and sanitization
        const validation = validateEmbeddingText(text)
        if (!validation.isValid) {
          return NextResponse.json({ error: validation.error }, { status: 400 })
        }

        const result = await generateEmbedding(validation.sanitizedValue!)
        return NextResponse.json(result)
      }

      case "generateBatch": {
        const { texts } = data

        // Early batch size validation before expensive processing
        if (!Array.isArray(texts)) {
          return NextResponse.json(
            { error: "Texts must be an array" },
            { status: 400 },
          )
        }

        if (texts.length > MAX_BATCH_SIZE) {
          return NextResponse.json(
            {
              error: `Batch too large. Maximum size is ${MAX_BATCH_SIZE} items`,
            },
            { status: 413 },
          )
        }

        // Validate batch texts with strict limits and sanitization
        const validation = validateEmbeddingBatchText(texts)
        if (!validation.isValid) {
          return NextResponse.json({ error: validation.error }, { status: 400 })
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

        // Validate all required fields with strict limits and sanitization
        const validation = validateApiRequest(data, {
          contentId: {
            maxLength: INPUT_LIMITS.EMBEDDING_CONTENT_ID,
            required: true,
            sanitize: true,
          },
          contentType: {
            maxLength: INPUT_LIMITS.EMBEDDING_CONTENT_TYPE,
            required: true,
            sanitize: true,
          },
          language: {
            maxLength: INPUT_LIMITS.EMBEDDING_LANGUAGE,
            required: true,
            sanitize: true,
          },
          content: {
            maxLength: INPUT_LIMITS.EMBEDDING_CONTENT,
            required: true,
            sanitize: true,
          },
        })

        if (!validation.isValid) {
          return NextResponse.json({ error: validation.error }, { status: 400 })
        }

        // Additional security validation: ensure contentType is in allowed list
        const sanitizedData = validation.sanitizedValue!
        if (!isValidContentType(sanitizedData.contentType)) {
          return NextResponse.json(
            {
              error: `Invalid content type: ${sanitizedData.contentType}. Allowed types: ${ALLOWED_CONTENT_TYPES.join(", ")}`,
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
          sanitizedData.contentId,
          sanitizedData.contentType,
          sanitizedData.language,
          sanitizedData.content,
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

        // Early batch size validation before expensive processing
        if (!Array.isArray(batchEmbeddings)) {
          return NextResponse.json(
            { error: "Embeddings must be an array" },
            { status: 400 },
          )
        }

        if (batchEmbeddings.length === 0) {
          return NextResponse.json(
            { error: "Embeddings must be a non-empty array" },
            { status: 400 },
          )
        }

        if (batchEmbeddings.length > MAX_BATCH_SIZE) {
          return NextResponse.json(
            {
              error: `Batch too large. Maximum size is ${MAX_BATCH_SIZE} items`,
            },
            { status: 413 },
          )
        }

        // Validate and sanitize each embedding in the batch
        const sanitizedBatchEmbeddings = []
        for (let i = 0; i < batchEmbeddings.length; i++) {
          const emb = batchEmbeddings[i]

          // Validate each embedding field
          const validation = validateApiRequest(emb, {
            contentId: {
              maxLength: INPUT_LIMITS.EMBEDDING_CONTENT_ID,
              required: true,
              sanitize: true,
            },
            contentType: {
              maxLength: INPUT_LIMITS.EMBEDDING_CONTENT_TYPE,
              required: true,
              sanitize: true,
            },
            language: {
              maxLength: INPUT_LIMITS.EMBEDDING_LANGUAGE,
              required: true,
              sanitize: true,
            },
            content: {
              maxLength: INPUT_LIMITS.EMBEDDING_CONTENT,
              required: true,
              sanitize: true,
            },
          })

          if (!validation.isValid) {
            return NextResponse.json(
              { error: `Embedding ${i + 1}: ${validation.error}` },
              { status: 400 },
            )
          }

          if (!validateEmbedding(emb.embedding)) {
            return NextResponse.json(
              {
                error: `Embedding ${i + 1}: Invalid embedding format. Expected ${getEmbeddingDimensions()} dimensions`,
              },
              { status: 400 },
            )
          }

          // Add sanitized embedding to batch
          const sanitizedData = validation.sanitizedValue as any
          sanitizedBatchEmbeddings.push({
            contentId: sanitizedData.contentId,
            contentType: sanitizedData.contentType,
            language: sanitizedData.language,
            content: sanitizedData.content,
            embedding: emb.embedding, // Keep original embedding array as is
          })
        }

        await storeBatchEmbeddings(sanitizedBatchEmbeddings)
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

        // Validate required fields
        const validation = validateApiRequest(data, {
          contentId: {
            maxLength: INPUT_LIMITS.EMBEDDING_CONTENT_ID,
            required: true,
            sanitize: true,
          },
          contentType: {
            maxLength: INPUT_LIMITS.EMBEDDING_CONTENT_TYPE,
            required: true,
            sanitize: true,
          },
        })

        if (!validation.isValid) {
          return NextResponse.json({ error: validation.error }, { status: 400 })
        }

        const sanitizedData = validation.sanitizedValue as any
        const exists = await embeddingExists(
          sanitizedData.contentId,
          sanitizedData.contentType,
        )
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
