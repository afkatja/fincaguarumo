import { validateSemanticRAGSetup } from "../src/lib/semantic-rag/semantic-context-builder"

async function runValidation() {
  console.log("Running semantic RAG validation...")

  try {
    const result = await validateSemanticRAGSetup()

    console.log("\n=== VALIDATION RESULTS ===")
    console.log("Valid:", result.isValid)

    if (result.errors.length > 0) {
      console.log("\nErrors:")
      result.errors.forEach(error => console.log("  -", error))
    }

    if (result.warnings.length > 0) {
      console.log("\nWarnings:")
      result.warnings.forEach(warning => console.log("  -", warning))
    }

    if (result.stats) {
      console.log("\nStats:")
      console.log("  Total embeddings:", result.stats.totalEmbeddings)
      console.log("  Content types:", result.stats.contentTypes)
      console.log("  Languages:", result.stats.languages)
    }
  } catch (error) {
    console.error("Validation failed:", error)
  }
}

runValidation()
