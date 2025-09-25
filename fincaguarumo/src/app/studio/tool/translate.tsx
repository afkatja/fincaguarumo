import { useState, useEffect } from "react"
import { Card, Button, Text, Select, Spinner, Stack, Box } from "@sanity/ui"
import { useClient } from "sanity"
import { locales } from "../../../config"
import { SanityDocument } from "next-sanity"

export function TranslateTool() {
  const [documents, setDocuments] = useState<SanityDocument[]>([])
  const [selectedDoc, setSelectedDoc] = useState<SanityDocument | null>(null)
  const [isTranslating, setIsTranslating] = useState(false)
  const [message, setMessage] = useState("")
  const client = useClient()

  useEffect(() => {
    // Fetch documents that need translation
    const fetchDocuments = async () => {
      const docs = await client.fetch(`
        *[_type in ['faq', 'page', 'post', 'home', 'tour'] && language == 'en'] {
          _id,
          _type,
          title,
          question,
          answer, subtitle, description, body,
          "hasTranslations": count(*[__i18n_base == ^._id])
        }
      `)
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
          targetLanguages: locales.filter(lang => lang !== "en"), // Exclude source language
        }),
      })

      const result = await response.json()

      console.log({ result })

      if (result.success) {
        setMessage(
          `Successfully translated to ${result.translations.length} languages`
        )
      } else {
        setMessage(`Error: ${result.error}`)
      }
    } catch (error) {
      setMessage(`Error: ${error}`)
    }

    setIsTranslating(false)
  }

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
            const doc = documents.find(d => d._id === event.target.value)
            setSelectedDoc(doc)
          }}
        >
          {documents.map(doc => (
            <option key={doc._id} value={doc._id}>
              {doc.title || doc.question || "Untitled"} ({doc._type}) -{" "}
              {doc.hasTranslations} translations
            </option>
          ))}
        </Select>

        <Button
          text="Translate to Spanish, Dutch, Russian & German"
          tone="primary"
          onClick={handleTranslate}
          disabled={!selectedDoc || isTranslating}
          icon={isTranslating ? Spinner : undefined}
        />

        {message && (
          <Text
            size={1}
            style={{ color: message.includes("Error") ? "red" : "green" }}
          >
            {message}
          </Text>
        )}
      </Stack>
    </Box>
  )
}
