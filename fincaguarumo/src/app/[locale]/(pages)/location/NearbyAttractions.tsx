"use client"

import Image from "next/image"
import { useTranslations } from "next-intl"

interface AttractionItem {
  name: string
  description?: string
  distance: string
  category: string
  coordinates?: { lat: number; lng: number }
  image?: {
    url: string
    alt?: string
  }
}

interface NearbyAttractionsProps {
  attractions: AttractionItem[]
}

const categoryLabels: Record<string, string> = {
  "national-park": "National Park",
  beach: "Beach",
  wildlife: "Wildlife Viewing",
  town: "Town / Services",
  restaurant: "Restaurant",
  adventure: "Adventure",
  cultural: "Cultural",
}

const categoryIcons: Record<string, React.ReactNode> = {
  "national-park": (
    <svg
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  ),
  beach: (
    <svg
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M21 12c0 1.2-4.03 6-9 6s-9-4.8-9-6c0-1.2 4.03-6 9-6s9 4.8 9 6z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 6v6l4 2"
      />
    </svg>
  ),
  wildlife: (
    <svg
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
      />
    </svg>
  ),
  town: (
    <svg
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
      />
    </svg>
  ),
  restaurant: (
    <svg
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
      />
    </svg>
  ),
  adventure: (
    <svg
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M13 10V3L4 14h7v7l9-11h-7z"
      />
    </svg>
  ),
  cultural: (
    <svg
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
      />
    </svg>
  ),
}

export default function NearbyAttractions({
  attractions,
}: NearbyAttractionsProps) {
  const t = useTranslations("location")
  if (!attractions || attractions.length === 0) {
    return (
      <p className="text-muted-foreground">
        {t("noAttractions", { defaultValue: "No nearby attractions listed" })}
      </p>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {attractions.map((attraction, index) => (
        <article
          key={`${attraction.name}-${index}`}
          className="group border border-border rounded-xl overflow-hidden bg-card transition-shadow hover:shadow-lg"
        >
          {attraction.image?.url && (
            <div className="relative aspect-video overflow-hidden">
              <Image
                src={attraction.image.url}
                alt={attraction.image.alt || attraction.name}
                fill
                className="object-cover transition-transform duration-300 group-hover:scale-105"
                sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
              />
              <div className="absolute top-2 right-2">
                <span className="px-2 py-1 text-xs font-medium bg-background/90 backdrop-blur rounded-full">
                  {categoryLabels[attraction.category] || attraction.category}
                </span>
              </div>
            </div>
          )}
          <div className="p-4 space-y-2">
            <h3 className="font-semibold group-hover:text-primary transition-colors">
              {attraction.name}
            </h3>
            {attraction.description && (
              <p className="text-sm text-muted-foreground line-clamp-2">
                {attraction.description}
              </p>
            )}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {categoryIcons[attraction.category] || categoryIcons.wildlife}
              <span>{attraction.distance}</span>
            </div>
          </div>
        </article>
      ))}
    </div>
  )
}
