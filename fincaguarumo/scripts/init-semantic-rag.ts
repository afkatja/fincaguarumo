#!/usr/bin/env node

/**
 * Initialize Semantic RAG System
 *
 * This script sets up the semantic RAG system by:
 * 1. Validating the setup
 * 2. Creating initial embeddings for all content
 * 3. Providing statistics
 */

import {
  rebuildAllEmbeddings,
  getSemanticRAGStats,
  validateSemanticRAGSetup,
} from "../src/lib/semantic-rag/semantic-context-builder"

async function main() {
  console.log("🚀 Initializing Semantic RAG System for Villa Bruno\n")

  try {
    // Step 1: Validate setup
    console.log("📋 Step 1: Validating setup...")
    const validation = await validateSemanticRAGSetup()

    if (!validation.isValid) {
      console.error("❌ Setup validation failed:")
      validation.errors.forEach(error => console.error(`   - ${error}`))
      if (validation.warnings.length > 0) {
        console.log("\n⚠️  Warnings:")
        validation.warnings.forEach(warning => console.log(`   - ${warning}`))
      }
      process.exit(1)
    }

    console.log("✅ Setup validation passed!")

    // Step 2: Get current stats
    console.log("\n📊 Step 2: Checking current stats...")
    const stats = await getSemanticRAGStats()
    console.log(`   Total embeddings: ${stats.totalEmbeddings}`)
    console.log("   Content types:")
    Object.entries(stats.contentTypes).forEach(([type, count]) => {
      console.log(`     - ${type}: ${count}`)
    })
    console.log("   Languages:")
    Object.entries(stats.languages).forEach(([lang, count]) => {
      console.log(`     - ${lang}: ${count}`)
    })

    // Step 3: Rebuild embeddings
    console.log("\n🔄 Step 3: Rebuilding embeddings...")
    console.log("   This may take a while as we process all content types...")

    const languages = ["en", "es", "de", "nl", "ru"]

    for (const language of languages) {
      console.log(`\n   Processing ${language}...`)
      await rebuildAllEmbeddings(language)
      console.log(`   ✅ Completed ${language}`)
    }

    // Step 4: Final stats
    console.log("\n📊 Step 4: Final statistics...")
    const finalStats = await getSemanticRAGStats()
    console.log(`   Total embeddings: ${finalStats.totalEmbeddings}`)
    console.log("   Content types:")
    Object.entries(finalStats.contentTypes).forEach(([type, count]) => {
      console.log(`     - ${type}: ${count}`)
    })
    console.log("   Languages:")
    Object.entries(finalStats.languages).forEach(([lang, count]) => {
      console.log(`     - ${lang}: ${count}`)
    })

    console.log(
      "\n🎉 Semantic RAG System initialization completed successfully!",
    )
    console.log("\n📝 Next steps:")
    console.log("   1. Test the chatbot with semantic search")
    console.log("   2. Monitor performance and accuracy")
    console.log("   3. Set up periodic embedding updates")
    console.log("   4. Consider implementing A/B testing")
  } catch (error) {
    console.error("❌ Initialization failed:", error)
    process.exit(1)
  }
}

// Check if this is being run directly
if (require.main === module) {
  main().catch(console.error)
}

export { main }
