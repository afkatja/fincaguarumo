"use client"
import { useState, useEffect } from "react"
import { Button, Text, Select, Spinner, Stack, Box } from "@sanity/ui"
import { useClient } from "sanity"
import { locales, languages } from "../../../config"
import {
  getTranslatableDocumentsQuery,
  translatableTypes,
} from "../../../sanity/lib/translationQueries"

interface TranslatableDoc {
  _id: string
  _type: string
  _updatedAt?: string
  displayTitle: string
  translationCount: number
  translatedLanguages: string[]
}

const typeLabels: Record<string, string> = {
  home: "Homepage",
  accommodation: "Accommodations",
  page: "Pages",
  post: "Blog Posts",
  whyChooseVillaBruno: "Why Choose Villa Bruno",
  locationPage: "Location Pages",
  faq: "FAQ",
  tour: "Tours",
  activityBlock: "Activity Blocks",
}

export function TranslateTool() {
  const [documents, setDocuments] = useState<TranslatableDoc[]>([])
  const [selectedDoc, setSelectedDoc] = useState<TranslatableDoc | null>(null)
  const [isTranslating, setIsTranslating] = useState(false)
  const [isCopying, setIsCopying] = useState(false)
  const [message, setMessage] = useState("")
  const [copyMessage, setCopyMessage] = useState("")
  const client = useClient({
    apiVersion: process.env.NEXT_PUBLIC_SANITY_STUDIO_API_VERSION!,
  })

  const targetLanguages = locales.filter(lang => lang !== "en")

  const targetLanguageNames = targetLanguages.map(lang => {
    const match = languages.find(l => l.value === lang)
    return match ? match.title : lang
  })

  const missingLanguages = selectedDoc
    ? targetLanguages.filter(
        lang => !selectedDoc.translatedLanguages.includes(lang),
      )
    : targetLanguages

  const missingLanguageNames = missingLanguages.map(lang => {
    const match = languages.find(l => l.value === lang)
    return match ? match.title : lang
  })

  useEffect(() => {
    const fetchDocuments = async () => {
      const docs = await client.fetch(getTranslatableDocumentsQuery, {
        types: translatableTypes,
      })
      setDocuments(docs)
    }

    fetchDocuments()
  }, [client])

  const handleTranslate = async () => {
    if (!selectedDoc) return

    setIsTranslating(true)
    setMessage("")

    try {
      const response = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          docId: selectedDoc._id,
          docType: selectedDoc._type,
          targetLanguages: missingLanguages,
        }),
      })

      const result = await response.json()

      if (result.success) {
        setMessage(
          `Successfully translated to ${result.translations.length} languages`,
        )
      } else {
        setMessage(`Error: ${result.error}`)
      }
    } catch (error) {
      setMessage(`Error: ${error}`)
    }

    setIsTranslating(false)
  }

  const handleCopyFields = async () => {
    if (!selectedDoc) return

    setIsCopying(true)
    setCopyMessage("")

    try {
      const response = await fetch("/api/copy-fields", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          docId: selectedDoc._id,
          docType: selectedDoc._type,
          targetLanguages: targetLanguages,
        }),
      })

      const result = await response.json()

      if (result.success) {
        setCopyMessage(
          `Copied fields to ${result.copied} language(s)${
            result.skipped > 0 ? `, ${result.skipped} already complete` : ""
          }`,
        )
      } else {
        setCopyMessage(`Error: ${result.error}`)
      }
    } catch (error) {
      setCopyMessage(`Error: ${error}`)
    }

    setIsCopying(false)
  }

  const groupedDocs = documents.reduce<Record<string, TranslatableDoc[]>>(
    (acc, doc) => {
      const type = doc._type
      if (!acc[type]) acc[type] = []
      acc[type].push(doc)
      return acc
    },
    {},
  )

  return (
    <Box padding={4}>
      <Stack space={4}>
        <Text size={3} weight="semibold">
          Auto-translate Documents
        </Text>

        <Select
          placeholder="Select a document to translate"
          value={selectedDoc?._id || ""}
          onChange={event => {
            const target = event.target as HTMLSelectElement
            const doc = documents.find(d => d._id === target.value) || null
            setSelectedDoc(doc)
          }}
        >
          <option value="">Select a document...</option>
          {Object.keys(typeLabels).map(type => {
            const docs = groupedDocs[type]
            if (!docs || docs.length === 0) return null
            return (
              <optgroup key={type} label={typeLabels[type]}>
                {docs.map(doc => (
                  <option key={doc._id} value={doc._id}>
                    {doc.displayTitle} — {doc.translationCount} translation(s)
                  </option>
                ))}
              </optgroup>
            )
          })}
        </Select>

        <Button
          text={
            missingLanguages.length > 0
              ? `Translate to ${missingLanguageNames.join(", ")}`
              : "All translations complete"
          }
          tone="primary"
          onClick={handleTranslate}
          disabled={
            !selectedDoc || isTranslating || missingLanguages.length === 0
          }
          icon={isTranslating ? Spinner : undefined}
        />

        <Button
          text={`Copy fields as-is to ${targetLanguageNames.join(", ")}`}
          tone="neutral"
          onClick={handleCopyFields}
          disabled={!selectedDoc || isCopying}
          icon={isCopying ? Spinner : undefined}
        />

        {message && (
          <Text
            size={1}
            style={{ color: message.includes("Error") ? "red" : "green" }}
          >
            {message}
          </Text>
        )}

        {copyMessage && (
          <Text
            size={1}
            style={{ color: copyMessage.includes("Error") ? "red" : "green" }}
          >
            {copyMessage}
          </Text>
        )}
      </Stack>
    </Box>
  )
}
