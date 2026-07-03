#!/usr/bin/env tsx

import { QdrantClient } from "@qdrant/js-client-rest"
import { getSemanticRAGConfig } from "../src/lib/semantic-rag/config"

async function checkQdrantHealth() {
  try {
    const config = getSemanticRAGConfig()

    if (!config.qdrantUrl || !config.qdrantApiKey) {
      throw new Error("Missing QDRANT_URL or QDRANT_API_KEY")
    }

    console.log(`Checking Qdrant at: ${config.qdrantUrl}`)

    const client = new QdrantClient({
      url: config.qdrantUrl,
      apiKey: config.qdrantApiKey,
    })

    // Test basic connection - just try to list collections
    try {
      await client.getCollections()
      console.log("Qdrant connection successful")

      // Check if target collection exists
      try {
        await client.getCollection("content_embeddings")
        console.log("Collection exists - ready for use")
      } catch (error) {
        console.log("Collection doesn't exist yet - ready for migration")
      }
    } catch (error) {
      throw new Error("Cannot connect to Qdrant")
    }

    console.log("Qdrant environment is ready!")
    return true
  } catch (error) {
    console.error("Qdrant health check failed:", error)
    return false
  }
}

checkQdrantHealth().then(ready => {
  process.exit(ready ? 0 : 1)
})
