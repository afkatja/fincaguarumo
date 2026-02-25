// Migration script to migrate Villa Bruno page content to accommodationType
import { groq } from "next-sanity"
import { migrationClient } from "./migrationClient"

async function migrateVillaBrunoToAccommodation() {
  try {
    console.log("Using token?", !!process.env.SANITY_API_WRITE_TOKEN)

    console.log("Starting Villa Bruno migration to accommodation type...")

    // Find existing Villa Bruno page(s) - targeting the /stay slug specifically
    const villaBrunoQuery = groq`*[_type == "page" && slug.current == "stay"] {
      _id,
      title,
      subtitle,
      description,
      price,
      body,
      language,
      isPublished,
      mainImage,
      slug,
      slideshow,
      categories,
      showBookingOptions,
      showFAQ,
      faq,
      showBookingDialog,
      displayReviews
    }`

    const villaBrunoPages = await migrationClient.fetch(villaBrunoQuery)

    if (!villaBrunoPages || villaBrunoPages.length === 0) {
      console.error("No Villa Bruno page found with slug 'stay'")
      console.log("Checking for any Villa Bruno pages...")

      // Fallback: search for any page with Villa Bruno in title
      const fallbackQuery = groq`*[_type == "page" && title match "Villa Bruno"] {
        _id,
        title,
        slug
      }`
      const fallbackPages = await migrationClient.fetch(fallbackQuery)

      if (fallbackPages && fallbackPages.length > 0) {
        console.log(
          "Found Villa Bruno pages:",
          fallbackPages.map((p: any) => `${p.title} (${p.slug?.current})`),
        )
      } else {
        console.log("No Villa Bruno pages found at all")
      }
      return
    }

    console.log(
      `Found ${villaBrunoPages.length} Villa Bruno page(s) to migrate`,
    )

    for (const page of villaBrunoPages) {
      console.log(`Migrating: ${page.title} (${page.language || "en"})`)

      // Create accommodation document with mapped fields
      const accommodationDoc = {
        _id: `accommodation-villa-bruno-${page.language || "en"}`, // Fixed ID for idempotent updates
        _type: "accommodation",
        // Basic fields (mapped from page)
        title: page.title,
        subtitle: page.subtitle,
        description: page.description,
        language: page.language || "en",
        slug: {
          _type: "slug",
          current: "villa-bruno", // New slug for accommodation
          source: "title",
        },
        mainImage: page.mainImage,
        slideshow: page.slideshow,
        categories: page.categories,
        body: page.body,
        isPublished: page.isPublished,
        showBookingOptions: page.showBookingOptions ?? true, // Default to true for accommodations
        showFAQ: page.showFAQ ?? true, // Default to true for accommodations
        faq: page.faq,
        showBookingDialog: page.showBookingDialog ?? true, // Default to true for accommodations
        price: page.price,
        displayReviews: page.displayReviews ?? true, // Default to true for accommodations

        // New accommodation-specific fields with sensible defaults for Villa Bruno
        capacity: 4,
        bedrooms: 1,
        bathrooms: 1,
        propertyType: "villa",

        // Location details
        location: {
          address: "6 km from Puerto Jiménez",
          city: "Puerto Jiménez",
          region: "Puntarenas",
          country: "Costa Rica",
          coordinates: {
            _type: "geopoint",
            lat: 8.5447,
            lng: -83.5167,
          },
        },

        // Check-in/out times
        checkInTime: "3:00 PM",
        checkOutTime: "11:00 AM",

        // Highlight features specific to Villa Bruno
        highlightFeatures: [
          {
            title: "Solar Powered",
            description:
              "100% solar-powered system for sustainable luxury living",
            icon: "Sun",
          },
          {
            title: "Wildlife Viewing",
            description: "Macaws, monkeys and toucans right from your terrace",
            icon: "Binoculars",
          },
          {
            title: "Spring Water",
            description:
              "Crystal clear spring water with rainwater harvesting system",
            icon: "Droplet",
          },
          {
            title: "Ocean Views",
            description: "Panoramic jungle and Gulf of Dulce views",
            icon: "Mountain",
          },
        ],

        // References to be populated manually (empty arrays for now)
        amenities: [],
        pricingRules: [],
        paymentMethods: [],
        cancellationPolicy: null,
        logistics: [],
      }

      // Create or update the accommodation document
      const result = await migrationClient.createOrReplace(accommodationDoc)
      console.log(`✅ Accommodation document created/updated: ${result._id}`)

      // Store the original page ID for reference (don't delete yet)
      console.log(`📝 Original page ID (for reference): ${page._id}`)
    }

    console.log("\n✅ Migration completed successfully!")
    console.log("\nNext steps:")
    console.log(
      "1. Review the migrated accommodation documents in Sanity Studio",
    )
    console.log("2. Populate the references (amenities, pricingRules, etc.)")
    console.log("3. Test the new accommodation pages on the website")
    console.log("4. Once verified, you can delete the original page documents:")
    villaBrunoPages.forEach((page: any) => {
      console.log(`   - Page ID: ${page._id} (${page.language || "en"})`)
    })
  } catch (error: unknown) {
    console.error("❌ Migration failed:", error)
    if (error instanceof Error && error.message) {
      console.error("Error details:", error.message)
    }
  }
}

// Dry run function to preview what would be migrated
async function dryRun() {
  try {
    console.log("🔍 DRY RUN: Previewing Villa Bruno migration...")

    const villaBrunoQuery = groq`*[_type == "page" && slug.current == "stay"] {
      _id,
      title,
      subtitle,
      description,
      price,
      language,
      isPublished,
      slug
    }`

    const pages = await migrationClient.fetch(villaBrunoQuery)

    if (!pages || pages.length === 0) {
      console.log("No Villa Bruno pages found with slug 'stay'")
      return
    }

    console.log(`Found ${pages.length} page(s) to migrate:`)
    pages.forEach((page: any) => {
      console.log(`- ${page.title} (${page.language || "en"})`)
      console.log(`  ID: ${page._id}`)
      console.log(`  Slug: ${page.slug?.current}`)
      console.log(`  Price: $${page.price || "not set"}`)
      console.log(`  Published: ${page.isPublished}`)
      console.log("")
    })
  } catch (error: unknown) {
    console.error("❌ Dry run failed:", error)
  }
}

// Check if this is a dry run
const isDryRun = process.argv.includes("--dry-run")

if (isDryRun) {
  dryRun()
} else {
  migrateVillaBrunoToAccommodation()
}
