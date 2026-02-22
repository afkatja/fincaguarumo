// Migration script to create property documents from existing page data
import { client } from "@/sanity/lib/client"
import { groq } from "next-sanity"

async function migratePropertyData() {
  try {
    console.log("Starting property data migration...")

    // Find existing Villa Bruno page
    const villaBrunoQuery = groq`*[_type == "page" && title match "Villa Bruno"][0] {
      _id,
      title,
      subtitle,
      description,
      price,
      body,
      language,
      isPublished,
      mainImage,
      slug
    }`

    const villaBrunoPage = await client.fetch(villaBrunoQuery)

    if (!villaBrunoPage) {
      console.error("Villa Bruno page not found")
      return
    }

    console.log("Found Villa Bruno page:", villaBrunoPage.title)

    // Create property document
    const propertyDoc = {
      _id: "property-villa-bruno", // Fixed ID for idempotent updates
      _type: "property",
      propertyType: "villa",
      title: "Villa Bruno",
      subtitle:
        villaBrunoPage.subtitle || "Off-grid eco-villa on the Osa Peninsula",
      description:
        villaBrunoPage.description ||
        "Experience luxury off-grid living in Costa Rica's Osa Peninsula",
      price: villaBrunoPage.price || 115,
      capacity: {
        maxGuests: 4,
        bedrooms: 2,
        bathrooms: 1,
      },
      locationDetails: {
        address: "6 km from Puerto Jiménez",
        region: "Osa Peninsula, Costa Rica",
        country: "Costa Rica",
        proximity: [
          "6 km from Puerto Jiménez",
          "Easy access to Corcovado National Park",
          "Near pristine beaches",
          "Wildlife viewing opportunities",
        ],
      },
      propertyOverview: {
        title: "Villa Bruno",
        subtitle:
          villaBrunoPage.subtitle || "Off-grid eco-villa on the Osa Peninsula",
        description:
          villaBrunoPage.description ||
          "Experience luxury off-grid living in Costa Rica's Osa Peninsula",
        features: [
          "100% solar-powered system",
          "Crystal clear spring water",
          "Rainwater harvesting",
          "Herbs and fruit, straight from the farm",
          "Panoramic jungle and Gulf of Dulce views",
          "Off-grid eco-villa on the Osa Peninsula",
        ],
        highlights: [
          "Perfect for couples or families",
          "Wildlife at your doorstep",
          "Sustainable luxury living",
          "Authentic Costa Rica experience",
        ],
      },
      keyFeatures: [
        "100% luxury on solar energy - Sustainable comfort with panoramic jungle views",
        "Wildlife at your doorstep - Macaws, monkeys and toucans from your terrace",
        "6 km from Puerto Jiménez - Easy access to Corcovado National Park adventures",
        "Perfect for couples or families seeking an authentic rainforest experience",
      ],
      amenities: [], // Will be populated separately
      mainImage: villaBrunoPage.mainImage,
      isPublished: true,
      language: villaBrunoPage.language || "en",
    }

    // Create or update the property document
    const result = await client.createOrReplace(propertyDoc)
    console.log("Property document created/updated:", result._id)

    console.log("✅ Migration completed successfully!")
    console.log("Next steps:")
    console.log("1. Update amenities references in Sanity Studio")
    console.log("2. Verify property data in chatbot responses")
    console.log("3. Test hallucination detection with real data")
  } catch (error) {
    console.error("❌ Migration failed:", error)
  }
}

// Run the migration
migratePropertyData()
