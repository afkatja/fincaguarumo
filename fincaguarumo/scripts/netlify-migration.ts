#!/usr/bin/env tsx

import { execSync } from "child_process"

async function runNetlifyMigration() {
  console.log("Starting Netlify migration process...")
  
  try {
    // Step 1: Check Qdrant health
    console.log("Step 1: Checking Qdrant environment...")
    execSync("npm run qdrant:health", { stdio: "inherit" })
    
    // Step 2: Run dry-run migration
    console.log("Step 2: Running dry-run migration...")
    execSync("npm run migrate:to-cloud:dry-run", { stdio: "inherit" })
    
    // Step 3: Run actual migration
    console.log("Step 3: Running actual migration...")
    execSync("npm run migrate:to-cloud", { stdio: "inherit" })
    
    // Step 4: Validate migration
    console.log("Step 4: Validating migration...")
    execSync("npm run migrate:to-cloud:validate", { stdio: "inherit" })
    
    console.log("Netlify migration completed successfully!")
    return true
  } catch (error) {
    console.error("Netlify migration failed:", error)
    return false
  }
}

runNetlifyMigration().then(success => {
  process.exit(success ? 0 : 1)
})
