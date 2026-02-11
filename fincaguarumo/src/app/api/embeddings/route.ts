import { NextRequest, NextResponse } from 'next/server'
import {
  generateEmbedding,
  generateBatchEmbeddings,
  storeEmbedding,
  storeBatchEmbeddings,
  embeddingExists,
  validateEmbedding,
  getEmbeddingDimensions,
} from '@/lib/semantic-rag/embeddings'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, ...data } = body

    switch (action) {
      case 'generate': {
        const { text } = data
        if (!text || typeof text !== 'string') {
          return NextResponse.json(
            { error: 'Text is required and must be a string' },
            { status: 400 }
          )
        }

        const result = await generateEmbedding(text)
        return NextResponse.json(result)
      }

      case 'generateBatch': {
        const { texts } = data
        if (!Array.isArray(texts) || texts.length === 0) {
          return NextResponse.json(
            { error: 'Texts must be a non-empty array' },
            { status: 400 }
          )
        }

        const results = await generateBatchEmbeddings(texts)
        return NextResponse.json({ embeddings: results })
      }

      case 'store': {
        const { contentId, contentType, language, content, embedding, metadata } = data
        
        if (!contentId || !contentType || !language || !content || !embedding) {
          return NextResponse.json(
            { error: 'contentId, contentType, language, content, and embedding are required' },
            { status: 400 }
          )
        }

        if (!validateEmbedding(embedding)) {
          return NextResponse.json(
            { error: `Invalid embedding format. Expected ${getEmbeddingDimensions()} dimensions` },
            { status: 400 }
          )
        }

        await storeEmbedding(contentId, contentType, language, content, embedding, metadata)
        return NextResponse.json({ success: true })
      }

      case 'storeBatch': {
        const { embeddings: batchEmbeddings } = data
        
        if (!Array.isArray(batchEmbeddings) || batchEmbeddings.length === 0) {
          return NextResponse.json(
            { error: 'Embeddings must be a non-empty array' },
            { status: 400 }
          )
        }

        // Validate each embedding in the batch
        for (const emb of batchEmbeddings) {
          if (!emb.contentId || !emb.contentType || !emb.language || !emb.content || !emb.embedding) {
            return NextResponse.json(
              { error: 'Each embedding must have contentId, contentType, language, content, and embedding' },
              { status: 400 }
            )
          }
          if (!validateEmbedding(emb.embedding)) {
            return NextResponse.json(
              { error: `Invalid embedding format. Expected ${getEmbeddingDimensions()} dimensions` },
              { status: 400 }
            )
          }
        }

        await storeBatchEmbeddings(batchEmbeddings)
        return NextResponse.json({ success: true })
      }

      case 'exists': {
        const { contentId, contentType } = data
        
        if (!contentId || !contentType) {
          return NextResponse.json(
            { error: 'contentId and contentType are required' },
            { status: 400 }
          )
        }

        const exists = await embeddingExists(contentId, contentType)
        return NextResponse.json({ exists })
      }

      case 'validate': {
        const { embedding } = data
        
        if (!embedding) {
          return NextResponse.json(
            { error: 'Embedding is required' },
            { status: 400 }
          )
        }

        const isValid = validateEmbedding(embedding)
        return NextResponse.json({ 
          valid: isValid,
          expectedDimensions: getEmbeddingDimensions(),
          actualDimensions: embedding.length
        })
      }

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('Embeddings API error:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    return NextResponse.json({
      model: 'intfloat/e5-base-instruct',
      dimensions: getEmbeddingDimensions(),
      endpoint: '/api/embeddings',
      actions: [
        'generate - Generate embedding for single text',
        'generateBatch - Generate embeddings for multiple texts',
        'store - Store single embedding',
        'storeBatch - Store multiple embeddings',
        'exists - Check if embedding exists',
        'validate - Validate embedding format'
      ]
    })
  } catch (error) {
    console.error('Embeddings GET error:', error)
    return NextResponse.json(
      { error: 'Failed to get embeddings info' },
      { status: 500 }
    )
  }
}
