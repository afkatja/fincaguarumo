#!/usr/bin/env tsx

import dotenv from "dotenv"
dotenv.config()

/**
 * Test script to verify local embedding integration with Ollama
 * Run with: npx tsx test-local-embeddings.ts
 */

import { generateEmbedding } from "./src/lib/semantic-rag/embeddings"

async function testLocalEmbeddings() {
  console.log("🧪 Testing Local Embedding Integration with Ollama\n")

  const testText = "What is the check-in time for Villa Bruno?"

  try {
    console.log(`📝 Test text: "${testText}"`)
    console.log(`🏠 Generating local embedding...`)

    const startTime = Date.now()
    const result = await generateEmbedding(testText)
    const endTime = Date.now()

    console.log(`✅ Embedding generated successfully!`)
    console.log(`⏱️  Latency: ${endTime - startTime}ms`)
    console.log(`📊 Dimensions: ${result.dimensions}`)
    console.log(`📏 Vector length: ${result.embedding.length}`)
    console.log(
      `🔢 First 5 values: [${result.embedding
        .slice(0, 5)
        .map(v => v.toFixed(6))
        .join(", ")}...]`,
    )
    console.log(
      `📈 Sample range: [${Math.min(...result.embedding).toFixed(3)}, ${Math.max(...result.embedding).toFixed(3)}]`,
    )

    // Test if it looks like a real embedding (not all zeros or all the same)
    const hasVariation = result.embedding.some(
      (val, idx) =>
        idx > 0 && Math.abs(val - result.embedding[idx - 1]) > 0.001,
    )

    console.log(`🎯 Real embedding detected: ${hasVariation ? "✅" : "❌"}`)

    if (hasVariation) {
      console.log("\n🎉 Local embeddings are working correctly!")
      console.log("💰 Cost savings: $0 (no API calls to external providers)")
    } else {
      console.log("\n⚠️  Embedding looks simulated - check Ollama setup")
    }
  } catch (error) {
    console.log(`❌ Embedding generation failed:`)
    console.log(
      `   Error: ${error instanceof Error ? error.message : "Unknown error"}`,
    )

    if (error instanceof Error) {
      if (error.message.includes("fetch")) {
        console.log("\n💡 Troubleshooting:")
        console.log("   1. Make sure Ollama is running: ollama serve")
        console.log(
          "   2. Check if embedding model is pulled: ollama pull nomic-embed-text",
        )
        console.log(
          "   3. Verify Ollama is accessible: curl http://localhost:11434/api/tags",
        )
      } else if (error.message.includes("model")) {
        console.log("\n💡 Model issues:")
        console.log(
          "   1. Pull the embedding model: ollama pull nomic-embed-text",
        )
        console.log("   2. Check available models: ollama list")
      }
    }
  }
}

// Run the test
testLocalEmbeddings().catch(console.error)
