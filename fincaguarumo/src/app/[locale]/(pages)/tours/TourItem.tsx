"use client"

import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import Image from "next/image"
import Badge from "@/components/badge"
import Icon from "@/components/Icon"
import { urlFor } from "@/sanity/lib/image"
import { titleCase, loadTranslations } from "../../../../lib/utils"
import { useEffect, useState } from "react"
import { SanityImageObject } from "../../../../types"

export type TourType = {
  title: string
  description?: string
  mainImage?: (SanityImageObject & { alt: string }) | null
  slug: { current: string }
  dateAdded?: string
  isNew?: boolean
  isFeatured?: boolean
  isPublished: boolean
  href: string
  /** lat/lng as decimal degrees in string form (e.g., "9.1234") */
  geo?: { lat: string; lng: string }
}

const TourItem = ({
  title,
  description,
  mainImage,
  slug,
  dateAdded,
  isNew,
  isFeatured,
  href,
  locale = "en",
}: TourType & { locale?: string }) => {
  const [translations, setTranslations] = useState<{
    cards: {
      new: string
      featured: string
      readMore: string
    }
  } | null>(null)

  useEffect(() => {
    const loadTranslationsData = async () => {
      const messages = await loadTranslations(locale)
      setTranslations(messages)
    }
    loadTranslationsData()
  }, [locale])

  // Fallback translations in case loading fails
  const fallbackTranslations = {
    cards: {
      new: "New",
      featured: "Featured",
      readMore: "Read more",
    },
  }

  const t = translations?.cards || fallbackTranslations.cards

  return (
    <Link href={href} className="group tour no-underline " prefetch>
      <Card className="h-full overflow-hidden rounded-xl bg-muted shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1 transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring border-background">
        <CardContent className="flex h-full flex-col justify-between p-6">
          <div className="relative">
            {isNew && <Badge text={t.new} />}
            {isFeatured && <Badge text={t.featured} />}
            {mainImage && (
              <Image
                src={urlFor(mainImage).url()}
                alt={mainImage.alt ?? ""}
                width={800}
                height={800}
                className="mt-0 mb-3 max-h-52 object-cover"
              />
            )}
            <h3 className="text-xl font-semibold">
              {titleCase(title.toLocaleLowerCase())}
            </h3>
            {description && (
              <p className="mt-2 text-muted-foreground">
                {titleCase(description.toLocaleLowerCase())}
              </p>
            )}
          </div>
          {dateAdded && (
            <div className="mt-4 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Icon icon="Calendar" className="h-4 w-4" />
                <span>{dateAdded}</span>
              </div>
            </div>
          )}
          <div className="flex items-center mt-3 text-guarumo-accent dark:text-card-foreground">
            <p className="fancy-underline">{t.readMore}</p>
            <Icon
              icon="ArrowRight"
              className="ml-auto h-5 w-5 transition-all group-hover:translate-x-1"
              color="currentColor"
            />
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}

export default TourItem
