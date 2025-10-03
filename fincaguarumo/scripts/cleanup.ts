import { createClient } from "next-sanity"

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET,
  useCdn: false,
  token: process.env.SANITY_API_WRITE_TOKEN,
  apiVersion: "2025-06-01",
})

export async function deleteDuplicateWithReferences(
  docId: string,
  force: boolean = false
) {
  try {
    // Find all translation.metadata documents that reference this doc
    const metadataDocs = await client.fetch(
      `
      *[_type == "translation.metadata" && $docId in translations[].value._ref] {
        _id,
        translations
      }
    `,
      { docId }
    )

    console.log(
      `Found ${metadataDocs.length} metadata docs referencing ${docId}`
    )

    // Remove the reference from each metadata doc
    for (const metadataDoc of metadataDocs) {
      const updatedTranslations = metadataDoc.translations.filter(
        (t: any) => t.value._ref !== docId
      )

      if (updatedTranslations.length === 0) {
        // If no translations left, delete the metadata doc
        await client.delete(metadataDoc._id)
        console.log(`Deleted empty metadata doc: ${metadataDoc._id}`)
      } else {
        // Update to remove the reference
        await client
          .patch(metadataDoc._id)
          .set({ translations: updatedTranslations })
          .commit()
        console.log(`Removed reference from metadata doc: ${metadataDoc._id}`)
      }
    }

    // Try to delete the document
    try {
      await client.delete(docId)
      console.log(`Successfully deleted document: ${docId}`)
    } catch (deleteError: any) {
      if (
        force &&
        deleteError.message.includes(
          "cannot be deleted as there are references"
        )
      ) {
        console.log(
          `Force deleting document with remaining references: ${docId}`
        )
        // Force delete by first finding and removing all references
        await forceDeleteDocument(docId)
      } else {
        throw deleteError
      }
    }
  } catch (error) {
    console.error(`Failed to delete ${docId}:`, error)
    throw error
  }
}

async function forceDeleteDocument(docId: string) {
  try {
    // Find ALL documents that reference this doc
    const referencingDocs = await client.fetch(`
      *[references("${docId}")] {
        _id,
        _type,
        "references": [references("${docId}")]
      }
    `)

    console.log(
      `Found ${referencingDocs.length} documents referencing ${docId}`
    )

    // Remove references from all documents
    for (const refDoc of referencingDocs) {
      try {
        // Get the full document to see what fields reference our doc
        const fullDoc = await client.getDocument(refDoc._id)

        // Find and remove references in all fields
        const updatedDoc = removeReferencesFromObject(fullDoc, docId)

        if (updatedDoc !== fullDoc) {
          await client.patch(refDoc._id).set(updatedDoc).commit()
          console.log(`Removed references from ${refDoc._type}: ${refDoc._id}`)
        }
      } catch (error) {
        console.error(`Failed to remove references from ${refDoc._id}:`, error)
      }
    }

    // Now try to delete again
    await client.delete(docId)
    console.log(`Force deleted document: ${docId}`)
  } catch (error) {
    console.error(`Force delete failed for ${docId}:`, error)
    throw error
  }
}

function removeReferencesFromObject(obj: any, docId: string): any {
  if (!obj || typeof obj !== "object") {
    return obj
  }

  if (Array.isArray(obj)) {
    return obj.map(item => removeReferencesFromObject(item, docId))
  }

  const result: any = {}
  for (const [key, value] of Object.entries(obj)) {
    if (key === "_ref" && value === docId) {
      // Skip this reference
      continue
    } else if (typeof value === "object" && value !== null) {
      const cleaned = removeReferencesFromObject(value, docId)
      if (cleaned !== value) {
        result[key] = cleaned
      } else {
        result[key] = value
      }
    } else {
      result[key] = value
    }
  }

  return result
}

// Standalone function to force delete a specific document
export async function forceDeleteDocumentById(docId: string) {
  console.log(`Force deleting document: ${docId}`)
  await deleteDuplicateWithReferences(docId, true)
}

export async function findAndDeleteDuplicates() {
  // Find documents with the same slug and language (duplicates)
  const duplicates = await client.fetch(`
    *[_type in ['page', 'post', 'tour', 'faq'] && defined(slug.current)] {
      _id,
      _type,
      language,
      title,
      slug,
      _createdAt,
      _updatedAt
    }
  `)

  // Group by slug.current + language + title to find duplicates
  const grouped = duplicates.reduce((acc: any, doc: any) => {
    const key = `${doc.slug.current}_${doc.language}_${doc.title}`
    if (!acc[key]) {
      acc[key] = []
    }
    acc[key].push(doc)
    return acc
  }, {})

  const duplicateGroups = Object.values(grouped).filter(
    (group: any) => group.length > 1
  )

  console.log(`Found ${duplicateGroups.length} groups of duplicate documents`)

  for (const group of duplicateGroups as any[]) {
    // Sort by creation date, keep the oldest (first created)
    group.sort(
      (a: any, b: any) =>
        new Date(a._createdAt).getTime() - new Date(b._createdAt).getTime()
    )

    const keepDoc = group[0] // Keep the first (oldest) document
    const deleteDocs = group.slice(1) // Delete the rest

    console.log(`\nDuplicate group: ${keepDoc.title} (${keepDoc.language})`)
    console.log(`Keeping: ${keepDoc._id} (created: ${keepDoc._createdAt})`)

    for (const docToDelete of deleteDocs) {
      console.log(
        `Deleting: ${docToDelete._id} (created: ${docToDelete._createdAt})`
      )
      try {
        await deleteDuplicateWithReferences(docToDelete._id, true) // Force deletion
      } catch (error) {
        console.error(`Failed to delete ${docToDelete._id}:`, error)
        // Continue with other deletions even if one fails
      }
    }
  }

  console.log("Duplicate cleanup completed!")
}

export async function fixMalformedSlugs() {
  const malformed = await client.fetch(`
    *[
      _type in ['page', 'post', 'tour', 'faq'] && 
      slug.current._type == "slug"
    ] {
      _id,
      _type,
      language,
      title,
      "correctSlug": slug.current.current
    }
  `)

  console.log(`Found ${malformed.length} malformed documents`)

  for (const doc of malformed) {
    try {
      await client
        .patch(doc._id)
        .set({
          slug: {
            _type: "slug",
            current: doc.correctSlug,
          },
        })
        .commit()
      console.log(`✅ Fixed ${doc._type} (${doc.language}): ${doc.title}`)
    } catch (error) {
      console.error(`❌ Failed to fix ${doc._id}:`, error)
    }
  }

  console.log("Done!")
}

// Run both cleanup functions
async function runCleanup() {
  console.log("🔧 Starting cleanup process...")

  // First fix malformed slugs
  await fixMalformedSlugs()

  // Then delete duplicates
  await findAndDeleteDuplicates()

  console.log("🎉 Cleanup completed!")
}

// Default export for backward compatibility
export default fixMalformedSlugs

// Run cleanup if this script is executed directly
if (require.main === module) {
  runCleanup()
}
