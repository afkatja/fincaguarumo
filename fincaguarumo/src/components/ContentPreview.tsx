"use client"
import React from "react"
import Title from "./Title"
import { Button } from "@/components/ui/button"
import { useTranslations } from "next-intl"
import { ArrowDownIcon } from "lucide-react"

interface ContentPreviewProps {
  summary?: string
}

export const ContentPreview = ({ summary }: ContentPreviewProps) => {
  const t = useTranslations("accommodation")
  if (!summary) return null

  return (
    <div className="">
      <Title
        title={t("aboutThisAccommodation")}
        Heading="h2"
        titleClassName="text-xl font-bold text-guarumo-primary dark:text-zinc-50 mb-4"
        icon={{ iconClassName: "fill-guarumo-accent dark:fill-zinc-50" }}
      />

      <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed">
        {summary}
      </p>

      <div className="mt-6 pt-6 border-t border-zinc-300 dark:border-zinc-700 md:border-0 text-center">
        <p className="text-zinc-600 dark:text-zinc-400 mb-4 text-sm">
          {t("continueReading")}
        </p>
        <Button
          variant="outline"
          className="group"
          onClick={() => {
            // Scroll to the full content section
            const fullContentElement = document.getElementById("full-content")
            if (fullContentElement) {
              fullContentElement.scrollIntoView({ behavior: "smooth" })
            }
          }}
        >
          {t("readMore")}
          <ArrowDownIcon className="w-4 h-4 ml-2 stroke-guarumo-primary" />
        </Button>
      </div>
    </div>
  )
}
