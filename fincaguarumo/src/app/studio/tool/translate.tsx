"use client"
import { useState, useEffect, type ChangeEvent } from "react"
import { Button, Text, Select, Spinner, Stack, Box } from "@sanity/ui"
import { useClient } from "sanity"
import { locales, languages } from "../../../config"
import {
  getTranslatableDocumentsQuery,
  translatableTypes,
} from "../../../sanity/lib/translationQueries"
import type { PortableTextBlock } from "@portabletext/types"
import { portableTextHasContent } from "../../../sanity/lib/portableTextHelper"

interface TranslatableDoc {
  _id: string
  _type: string
  _updatedAt?: string
  displayTitle: string
  translationCount: number
  translatedLanguages: {
    language: string
    translatedTitle?: string
    translatedBody?: PortableTextBlock[]
  }[]
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
  const [isLoadingDocuments, setIsLoadingDocuments] = useState(true)
  const [selectedDoc, setSelectedDoc] = useState<TranslatableDoc | null>(null)
  const [isTranslating, setIsTranslating] = useState(false)
  const [isCopying, setIsCopying] = useState(false)
  const [message, setMessage] = useState("")
  const [copyMessage, setCopyMessage] = useState("")
  const client = useClient({
    apiVersion: process.env.NEXT_PUBLIC_SANITY_STUDIO_API_VERSION!,
  })

  const targetLanguages = locales.filter(lang => lang !== "en")

  const missingLanguages = selectedDoc
    ? targetLanguages.filter(lang => {
        const translated = selectedDoc.translatedLanguages.find(
          tl => tl.language === lang,
        )
        // A language counts as missing when no translation document exists or
        // when its translated title/body fields are not yet filled.
        // translatedBody is Portable Text (array of blocks), not a plain
        // string. Check whether it contains any text without converting
        // away its markup.
        if (!translated) return true
        const hasBody = portableTextHasContent(translated.translatedBody ?? [])
        return !translated.translatedTitle?.trim() || !hasBody
      })
    : targetLanguages

  const missingLanguageNames = missingLanguages.map(lang => {
    const match = languages.find(l => l.value === lang)
    return match ? match.title : lang
  })

  // Languages without a translated document yet, i.e. languages the copy-as-is
  // fields still need to be copied to.
  const missingCopyLanguages = selectedDoc
    ? targetLanguages.filter(
        lang =>
          !selectedDoc.translatedLanguages.some(tl => tl.language === lang),
      )
    : targetLanguages

  const missingCopyLanguageNames = missingCopyLanguages.map(lang => {
    const match = languages.find(l => l.value === lang)
    return match ? match.title : lang
  })

  const fetchDocuments = async () => {
    setIsLoadingDocuments(true)
    try {
      const docs = await client.fetch(getTranslatableDocumentsQuery, {
        types: translatableTypes,
      })
      setDocuments(docs)
    } catch (error) {
      setMessage(`Error loading documents: ${error}`)
    } finally {
      setIsLoadingDocuments(false)
    }
  }

  // Refresh the selected document's discovery data so the button reflects
  // current translation completeness after an action completes.
  const refreshSelectedDoc = async () => {
    const docs = await client.fetch(getTranslatableDocumentsQuery, {
      types: translatableTypes,
    })
    setDocuments(docs)
    if (selectedDoc) {
      const refreshed = docs.find(
        (d: TranslatableDoc) => d._id === selectedDoc._id,
      )
      if (refreshed) setSelectedDoc(refreshed)
    }
  }

  useEffect(() => {
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
        await refreshSelectedDoc()
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
        await refreshSelectedDoc()
      } else {
        const messages: string[] = []
        if (result.error) messages.push(result.error)
        if (result.errors?.length) {
          messages.push(
            ...result.errors.map(
              (e: { language: string; error: string }) =>
                `${e.language}: ${e.error}`,
            ),
          )
        }
        setCopyMessage(`Error: ${messages.join("; ") || "Copy failed"}`)
        await refreshSelectedDoc()
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

        {isLoadingDocuments && documents.length === 0 ? (
          <Stack space={2} padding={4}>
            <Spinner />
            <Text size={1} muted>
              Loading documents…
            </Text>
          </Stack>
        ) : (
          <Select
            placeholder="Select a document to translate"
            value={selectedDoc?._id || ""}
            onChange={(event: ChangeEvent<HTMLSelectElement>) => {
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
        )}

        <Button
          text={
            missingLanguages.length > 0
              ? `Translate to ${missingLanguageNames.join(", ")}`
              : "All translations complete"
          }
          tone="primary"
          onClick={handleTranslate}
          disabled={
            !selectedDoc ||
            isTranslating ||
            isCopying ||
            missingLanguages.length === 0
          }
          icon={isTranslating ? Spinner : undefined}
        />

        <Button
          text={
            missingCopyLanguages.length > 0
              ? `Copy fields to ${missingCopyLanguageNames.join(", ")}`
              : "All fields copied"
          }
          tone="neutral"
          onClick={handleCopyFields}
          disabled={
            !selectedDoc ||
            isCopying ||
            isTranslating ||
            missingCopyLanguages.length === 0
          }
          icon={isCopying ? Spinner : undefined}
        />

        {message && (
          <Text
            size={1}
            className={
              message.includes("Error")
                ? "text-red-500 dark:text-red-400"
                : "text-green-500 dark:text-green-400"
            }
          >
            {message}
          </Text>
        )}

        {copyMessage && (
          <Text
            size={1}
            className={
              copyMessage.includes("Error")
                ? "text-red-500 dark:text-red-400"
                : "text-green-500 dark:text-green-400"
            }
          >
            {copyMessage}
          </Text>
        )}
      </Stack>
    </Box>
  )
}
