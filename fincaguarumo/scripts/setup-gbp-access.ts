#!/usr/bin/env node
// scripts/setup-gbp-access.ts
// Run: npx tsx scripts/setup-gbp-access.ts [--oauth]

import "dotenv/config"
import {
  listAccounts,
  listInvitations,
  acceptInvitation,
  fetchLocations,
} from "../src/lib/gbp/client"

async function main() {
  const useOAuth = process.argv.includes("--oauth")
  const authType = useOAuth ? "OAuth2 (human owner)" : "Service Account"

  console.log(`🔍 Checking GBP invitations (${authType})...\n`)

  try {
    const accounts = await listAccounts(!useOAuth)
    console.log(`📋 Accounts (${accounts.length}):`)
    for (const acc of accounts) {
      console.log(`  - ${acc.accountName} (${acc.name})`)
      console.log(`    Type: ${acc.type}, Verified: ${acc.verificationState || "N/A"}`)
    }
    console.log("")

    const invitations = await listInvitations(!useOAuth)

    if (invitations.length === 0) {
      console.log("✅ No pending invitations")
    } else {
      console.log(`📬 Found ${invitations.length} pending invitation(s):\n`)

      for (const inv of invitations) {
        console.log(`  Name: ${inv.name}`)
        console.log(`  Email: ${inv.emailAddress || "N/A"}`)
        console.log(`  Role: ${inv.role}`)
        console.log(`  State: ${inv.state}`)
        console.log(`  Location: ${inv.targetLocation?.locationName || "N/A"}`)
        console.log(`  Address: ${inv.targetLocation?.address || "N/A"}`)
        console.log(`  Place ID: ${inv.targetLocation?.placeId || "N/A"}`)
        console.log("")

        // Auto-accept
        console.log(`  → Accepting invitation...`)
        try {
          await acceptInvitation(inv.name, !useOAuth)
          console.log(`  ✅ Accepted!\n`)
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err)
          console.log(`  ❌ Failed: ${msg}`)
          console.log(
            `  💡 Try accepting manually in GBP UI: https://business.google.com/\n`,
          )
        }
      }
    }

    console.log("🔍 Fetching accessible locations...\n")
    const locations = await fetchLocations(!useOAuth)

    if (locations.length === 0) {
      console.log("⚠️  No locations accessible yet.")
      console.log("   Make sure invitation is accepted and wait a few minutes.")
    } else {
      console.log(`✅ Found ${locations.length} location(s):\n`)
      for (const loc of locations) {
        console.log(`  Name: ${loc.name}`)
        console.log(`  Title: ${loc.title}`)
        console.log(`  Address: ${loc.address || "N/A"}`)
        console.log(`  Phone: ${loc.phoneNumber || "N/A"}`)
        console.log("")
      }

      console.log("📋 Add to .env.local:")
      console.log(`GBP_LOCATION_ID=${locations[0].name}`)
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error("❌ Error:", msg)
    process.exit(1)
  }
}

main()