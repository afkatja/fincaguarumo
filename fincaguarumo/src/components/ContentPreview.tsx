"use client"
import React from "react"
import { PortableText, PortableTextReactComponents } from "next-sanity"
import { portableTextComponents } from "./RichText"
import Title from "./Title"
import { Button } from "@/components/ui/button"
import Icon from "./Icon"
import { useTranslations } from "next-intl"

interface ContentPreviewProps {
  body: any
  maxSections?: number
}

export const ContentPreview = ({
  body,
  maxSections = 2,
}: ContentPreviewProps) => {
  const t = useTranslations("accommodation")
  if (!body) return null

  // Extract the first few sections from the body content
  const previewSections = React.useMemo(() => {
    if (!Array.isArray(body)) return []

    let sectionCount = 0
    const previewBlocks = []

    for (const block of body) {
      if (sectionCount >= maxSections) break

      // Include different block types
      if (block._type === "block") {
        // Include paragraphs and headings
        if (block.style === "normal" || block.style?.startsWith("h")) {
          previewBlocks.push(block)
          if (block.style?.startsWith("h")) {
            sectionCount++
          }
        }
      } else if (
        block._type === "image" ||
        block._type === "imageWithMetadata"
      ) {
        // Include images
        previewBlocks.push(block)
      } else if (block._type === "columnsBlock") {
        // Include column blocks (but limit content)
        previewBlocks.push({
          ...block,
          value: {
            ...block.value,
            content: block.value?.content?.slice(0, 2) || [],
          },
        })
        sectionCount++
      }
    }

    return previewBlocks
  }, [body, maxSections])

  const hasMoreContent = React.useMemo(() => {
    if (!Array.isArray(body)) return false
    return body.length > previewSections.length
  }, [body, previewSections.length])

  if (previewSections.length === 0) return null

  return (
    <div className="w-11/12 mx-auto my-8">
      <div className="bg-linear-to-b from-white to-gray-50 dark:from-zinc-800 dark:to-zinc-900 rounded-lg p-6 border border-gray-200 dark:border-zinc-700">
        <Title
          title={t("aboutThisAccommodation") || "About this accommodation"}
          Heading="h2"
          titleClassName="text-2xl font-bold text-guarumo-primary dark:text-zinc-50 mb-4"
          icon={{ iconClassName: "fill-guarumo-accent dark:fill-zinc-50" }}
        />

        <div className="prose prose-lg max-w-none dark:prose-invert">
          <PortableText
            value={previewSections}
            components={portableTextComponents}
          />
        </div>

        {hasMoreContent && (
          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-zinc-700 text-center">
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              {t("continueReading") ||
                "Continue reading to learn more about this unique eco-villa experience..."}
            </p>
            <Button
              variant="outline"
              className="group"
              onClick={() => {
                // Scroll to the full content section
                const fullContentElement =
                  document.getElementById("full-content")
                if (fullContentElement) {
                  fullContentElement.scrollIntoView({ behavior: "smooth" })
                }
              }}
            >
              {t("readMore") || "Read more"}
              <Icon
                icon="ArrowDown"
                className="h-4 w-4 ml-2 transition-transform group-hover:translate-y-1"
                color="currentColor"
              />
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
