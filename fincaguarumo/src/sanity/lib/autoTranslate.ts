import { createClient } from "@sanity/client"
import translateText from "./translateText"
import { locales } from "../../config"

const client = createClient({
  projectId: "finca-guarumo",
  dataset: "production",
  useCdn: false,
  token: "your-write-token",
})

// Function to auto-translate FAQ content
export async function autoTranslateFAQ(docId: string, sourceLanguage = "en") {
  const targetLanguages = locales

  // Get the source document
  const sourceDoc = await client.fetch(
    `*[_type == "faq" && _id == $docId][0]`,
    { docId }
  )

  if (!sourceDoc) return

  for (const targetLang of targetLanguages) {
    try {
      const translatedQuestion = await translateText(
        sourceDoc.question,
        sourceLanguage,
        targetLang
      )

      const translatedAnswer = await translateText(
        sourceDoc.answer,
        sourceLanguage,
        targetLang
      )

      // Create translation document
      await client.createOrReplace({
        _id: `${docId}__i18n_${targetLang}`,
        _type: "translation.metadata",
        references: [
          {
            _type: "reference",
            _ref: docId,
            _key: targetLang,
          },
        ],
        value: {
          question: translatedQuestion,
          answer: translatedAnswer,
          category: sourceDoc.category, // Categories might not need translation
          keywords: sourceDoc.keywords, // Handle keywords separately if needed
          displayOrder: sourceDoc.displayOrder,
          showOnVillaBruno: sourceDoc.showOnVillaBruno,
        },
      })
    } catch (error) {
      console.error(`Translation failed for ${targetLang}:`, error)
    }
  }
}
