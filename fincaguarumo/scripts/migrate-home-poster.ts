// Migration script: convert home background_media_poster from array to single image
// for all published home documents (all languages / translations).
// Preserves the first (existing) poster image. Safe to re-run; non-array values are skipped.

import { migrationClient } from "./migrationClient"

interface HomeDoc {
  _id: string
  language?: string
  background_media_poster?: unknown
}

function isDryRun(): boolean {
  return process.argv.includes("--dry-run")
}

async function migrateHomePoster() {
  const dryRun = isDryRun()
  try {
    console.log(
      `Starting home background_media_poster migration (dry-run: ${dryRun})...`,
    )

    // All home documents across languages, excluding drafts => the published set.
    const homes = await migrationClient.fetch<HomeDoc[]>(
      `*[_type == "home" && !(_id in path('drafts.*'))]{
        _id,
        language,
        background_media_poster,
      }`,
    )

    console.log(`Found ${homes.length} home document(s)`)

    let migrated = 0
    let skipped = 0

    for (const home of homes) {
      const poster = home.background_media_poster

      // Already a single image, or empty/missing -> nothing to do
      if (!poster || !Array.isArray(poster) || poster.length === 0) {
        skipped++
        continue
      }

      const first = poster[0]
      if (!first || typeof first !== "object") {
        skipped++
        continue
      }

      // Single image field: _key is an array-item marker, drop it
      const singleImage = { ...first }
      delete singleImage._key

      if (dryRun) {
        console.log(
          `[dry-run] Would migrate ${home._id} (language: ${
            home.language ?? "?"
          }) -> single image`,
        )
        continue
      }

      await migrationClient.patch(home._id).set({ background_media_poster: singleImage }).commit()

      console.log(`✅ Migrated ${home._id} (language: ${home.language ?? "?"})`)
      migrated++
    }

    console.log("\n✅ Home poster migration complete")
    console.log(`Processed: ${homes.length}  Migrated: ${migrated}  Skipped: ${skipped}`)
  } catch (error) {
    console.error("❌ Migration failed:", error)
    process.exit(1)
  }
}

migrateHomePoster()
