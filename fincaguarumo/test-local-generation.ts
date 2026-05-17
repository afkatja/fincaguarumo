#!/usr/bin/env tsx
import dotenv from "dotenv"
dotenv.config()
/**
 * Test script to verify local generation adapter integration
 * Run with: npx tsx test-local-generation.ts
 */

import { getModelRole, getModelConfig } from "./src/lib/model-registry"
import { shouldUseLocalGenerations } from "./src/lib/task-router"
import { LocalAdapter } from "./src/lib/adapters/local-adapter"

async function testLocalGeneration() {
  console.log("🧪 Testing Local Generation Adapter Integration\n")

  // Test 1: Check environment configuration
  console.log("1. Environment Configuration:")
  console.log(`   shouldUseLocalGenerations(): ${shouldUseLocalGenerations()}`)
  console.log(
    `   GENERATION_MODEL_LOCAL_ADAPTER_KEY: ${process.env.GENERATION_MODEL_LOCAL_ADAPTER_KEY || "not set"}`,
  )
  console.log(`   NODE_ENV: ${process.env.NODE_ENV || "not set"}\n`)

  // Test 2: Check local adapter capabilities
  console.log("2. Local Adapter Capabilities:")
  const localAdapter = new LocalAdapter()
  const capabilities = [
    "embedding",
    "generation",
    "toolCalling",
    "multilingual",
  ]
  capabilities.forEach(cap => {
    console.log(`   ${cap}: ${localAdapter.supports(cap as any)}`)
  })
  console.log()

  // Test 3: Check model registry has local roles
  console.log("3. Model Registry Local Roles:")
  const config = getModelConfig()
  const localRoles = [
    "primary-local",
    "tools-local",
    "fast-local",
    "evaluation-local",
  ]

  localRoles.forEach(roleId => {
    const role = getModelRole(roleId)
    if (role) {
      console.log(`   ${roleId}: ✅`)
      console.log(`     adapter: ${role.adapterKey}`)
      console.log(`     model: ${role.modelRef}`)
      console.log(`     fallbacks: ${role.fallbacks.length} configured`)
    } else {
      console.log(`   ${roleId}: ❌ not found`)
    }
  })
  console.log()

  // Test 4: Try to create a model instance (if Ollama is running)
  console.log("4. Model Instance Creation:")
  try {
    const primaryLocal = getModelRole("primary-local")
    if (primaryLocal) {
      console.log(
        `   Attempting to create model instance for ${primaryLocal.modelRef}...`,
      )
      const model = localAdapter.createModelInstance(primaryLocal.modelRef)
      console.log(`   ✅ Model instance created: ${model.constructor.name}`)
    } else {
      console.log("   ❌ primary-local role not found")
    }
  } catch (error) {
    console.log(
      `   ❌ Model creation failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    )
    console.log("   (This is expected if Ollama is not running)")
  }
  console.log()

  // Test 5: Health check
  console.log("5. Local Adapter Health Check:")
  try {
    const healthResult = await localAdapter.healthCheck("test")
    console.log(
      `   Status: ${healthResult.isHealthy ? "✅ Healthy" : "❌ Unhealthy"}`,
    )
    console.log(`   Latency: ${healthResult.latency}ms`)
    if (healthResult.error) {
      console.log(`   Error: ${healthResult.error}`)
    }
  } catch (error) {
    console.log(
      `   ❌ Health check failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    )
  }
  console.log()

  // Test 6: Summary
  console.log("6. Summary:")
  const hasLocalRoles = localRoles.every(role => getModelRole(role))
  const canUseLocal = shouldUseLocalGenerations()

  console.log(`   Local roles configured: ${hasLocalRoles ? "✅" : "❌"}`)
  console.log(`   Will use local in current env: ${canUseLocal ? "✅" : "❌"}`)
  console.log(
    `   Ready for cost savings: ${hasLocalRoles && canUseLocal ? "✅" : "❌"}`,
  )

  if (!canUseLocal) {
    console.log("\n💡 To enable local generations:")
    console.log("   export GENERATION_MODEL_LOCAL_ADAPTER_KEY=local")
    console.log("   export NODE_ENV=development")
    console.log("   # Make sure Ollama is running on localhost:11434")
  }
}

// Run the test
testLocalGeneration().catch(console.error)
