/**
 * Test Semantic RAG Implementation
 * 
 * This file contains tests to validate the semantic RAG system
 */

import { validateSemanticRAGSetup } from "./semantic-context-builder"
import { generateEmbedding } from "./embeddings"
import { semanticSearch, hybridSearch } from "./vector-store"
import { processAllDocuments } from "./document-loaders"
import { createAdaptiveRetrievalChain } from "./retrieval-chains"

export async function runSemanticRAGTests() {
  console.log("🧪 Running Semantic RAG Tests\n")

  try {
    // Test 1: Validate Setup
    console.log("📋 Test 1: Validating setup...")
    const validation = await validateSemanticRAGSetup()
    
    if (!validation.isValid) {
      console.error("❌ Setup validation failed:")
      validation.issues.forEach(issue => console.error(`   - ${issue}`))
      return false
    }
    console.log("✅ Setup validation passed!")

    // Test 2: Embedding Generation
    console.log("\n🔤 Test 2: Testing embedding generation...")
    try {
      const testQuery = "What amenities are available at Villa Bruno?"
      const embedding = await generateEmbedding(testQuery)
      
      if (!embedding.embedding || embedding.embedding.length === 0) {
        console.error("❌ Embedding generation failed: Empty embedding")
        return false
      }
      
      if (embedding.dimensions !== 768) {
        console.error(`❌ Embedding generation failed: Wrong dimensions (${embedding.dimensions})`)
        return false
      }
      
      console.log(`✅ Embedding generation passed! (${embedding.dimensions} dimensions)`)
    } catch (error) {
      console.error("❌ Embedding generation failed:", error)
      return false
    }

    // Test 3: Document Processing
    console.log("\n📄 Test 3: Testing document processing...")
    try {
      const documents = await processAllDocuments("en")
      
      if (!Array.isArray(documents)) {
        console.error("❌ Document processing failed: Not an array")
        return false
      }
      
      if (documents.length === 0) {
        console.warn("⚠️  No documents found - this might be expected if Sanity is empty")
      } else {
        console.log(`✅ Document processing passed! (${documents.length} documents)`)
        
        // Check document structure
        const sampleDoc = documents[0]
        if (!sampleDoc.contentId || !sampleDoc.contentType || !sampleDoc.content) {
          console.error("❌ Document structure invalid")
          return false
        }
      }
    } catch (error) {
      console.error("❌ Document processing failed:", error)
      return false
    }

    // Test 4: Semantic Search
    console.log("\n🔍 Test 4: Testing semantic search...")
    try {
      const testQuery = "pool amenities"
      const results = await semanticSearch(testQuery, {
        language: "en",
        threshold: 0.5,
        maxResults: 5,
      })
      
      if (!Array.isArray(results)) {
        console.error("❌ Semantic search failed: Not an array")
        return false
      }
      
      console.log(`✅ Semantic search passed! (${results.length} results)`)
      
      // Check result structure
      if (results.length > 0) {
        const sampleResult = results[0]
        if (!sampleResult.contentId || !sampleResult.contentType || !sampleResult.content) {
          console.error("❌ Search result structure invalid")
          return false
        }
        
        if (typeof sampleResult.similarity !== 'number') {
          console.error("❌ Search result similarity score invalid")
          return false
        }
      }
    } catch (error) {
      console.error("❌ Semantic search failed:", error)
      return false
    }

    // Test 5: Hybrid Search
    console.log("\n🔀 Test 5: Testing hybrid search...")
    try {
      const testQuery = "wifi internet connection"
      const results = await hybridSearch(testQuery, {
        language: "en",
        threshold: 0.4,
        maxResults: 5,
      })
      
      if (!Array.isArray(results)) {
        console.error("❌ Hybrid search failed: Not an array")
        return false
      }
      
      console.log(`✅ Hybrid search passed! (${results.length} results)`)
      
      // Check result structure
      if (results.length > 0) {
        const sampleResult = results[0]
        if (!sampleResult.contentId || !sampleResult.contentType || !sampleResult.content) {
          console.error("❌ Hybrid search result structure invalid")
          return false
        }
        
        if (typeof sampleResult.combinedScore !== 'number') {
          console.error("❌ Hybrid search result combined score invalid")
          return false
        }
      }
    } catch (error) {
      console.error("❌ Hybrid search failed:", error)
      return false
    }

    // Test 6: Retrieval Chain
    console.log("\n⛓️  Test 6: Testing retrieval chain...")
    try {
      const testQuery = "What is the cancellation policy?"
      const contexts = await createAdaptiveRetrievalChain(testQuery, {
        language: "en",
        contextSize: 3,
      })
      
      if (!Array.isArray(contexts)) {
        console.error("❌ Retrieval chain failed: Not an array")
        return false
      }
      
      console.log(`✅ Retrieval chain passed! (${contexts.length} contexts)`)
      
      // Check context structure
      if (contexts.length > 0) {
        const sampleContext = contexts[0]
        if (!sampleContext.content || !sampleContext.metadata || !sampleContext.source) {
          console.error("❌ Context structure invalid")
          return false
        }
        
        if (typeof sampleContext.relevanceScore !== 'number') {
          console.error("❌ Context relevance score invalid")
          return false
        }
      }
    } catch (error) {
      console.error("❌ Retrieval chain failed:", error)
      return false
    }

    console.log("\n🎉 All tests passed! Semantic RAG system is working correctly.")
    return true

  } catch (error) {
    console.error("❌ Test suite failed:", error)
    return false
  }
}

export async function runPerformanceTests() {
  console.log("\n⚡ Running Performance Tests\n")

  try {
    // Test embedding generation performance
    console.log("🔤 Testing embedding generation performance...")
    const start = Date.now()
    await generateEmbedding("test query for performance")
    const embeddingTime = Date.now() - start
    console.log(`   Embedding generation: ${embeddingTime}ms`)

    // Test search performance
    console.log("🔍 Testing search performance...")
    const searchStart = Date.now()
    await semanticSearch("test query", { language: "en", maxResults: 10 })
    const searchTime = Date.now() - searchStart
    console.log(`   Semantic search: ${searchTime}ms`)

    const hybridStart = Date.now()
    await hybridSearch("test query", { language: "en", maxResults: 10 })
    const hybridTime = Date.now() - hybridStart
    console.log(`   Hybrid search: ${hybridTime}ms`)

    // Test retrieval chain performance
    console.log("⛓️  Testing retrieval chain performance...")
    const chainStart = Date.now()
    await createAdaptiveRetrievalChain("test query for performance", { language: "en" })
    const chainTime = Date.now() - chainStart
    console.log(`   Retrieval chain: ${chainTime}ms`)

    console.log("\n✅ Performance tests completed!")

  } catch (error) {
    console.error("❌ Performance tests failed:", error)
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runSemanticRAGTests()
    .then(success => {
      if (success) {
        return runPerformanceTests()
      }
    })
    .catch(console.error)
}
