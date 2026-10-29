"use client"

import Image from "next/image"
import { useState } from "react"
import { useTranslations } from "next-intl"
import { cn } from "@/lib/utils"

interface ActivityBlock {
  title: string
  subtitle?: string
  description?: string
  slug: { current: string }
  mainImage?: {
    url: string
    alt?: string
  }
  activities: Array<{
    name: string
    description?: string
    season?: string
    duration?: string
    distanceFromVilla?: string
    transportIncluded?: boolean
    difficulty?: string
    highlights?: string[]
    icon?: string
    isFeatured?: boolean
    sortOrder?: number
  }>
}

interface ActivityBlocksProps {
  blocks: ActivityBlock[]
  locale: string
}

const seasonLabels: Record<string, string> = {
  "year-round": "Year-round",
  dry: "Dry Season (Dec–Apr)",
  green: "Green Season (May–Nov)",
  whale: "Whale Season (Jul–Oct)",
}

const difficultyLabels: Record<string, string> = {
  easy: "Easy",
  moderate: "Moderate",
  challenging: "Challenging",
}

const difficultyColors: Record<string, string> = {
  easy: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  moderate:
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  challenging: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
}

const iconComponents: Record<string, React.ReactNode> = {
  bird: (
    <svg
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
      />
    </svg>
  ),
  hiking: (
    <svg
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M19 14l-7 7m0 0l-7-7m7 7V3"
      />
    </svg>
  ),
  whale: (
    <svg
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
      />
    </svg>
  ),
  park: (
    <svg
      className="h-5 w-5"
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
  kayak: (
    <svg
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
      />
    </svg>
  ),
  night: (
    <svg
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
      />
    </svg>
  ),
  photo: (
    <svg
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
      />
    </svg>
  ),
}

export default function ActivityBlocks({
  blocks,
  locale,
}: ActivityBlocksProps) {
  const t = useTranslations("villaBruno.activities")
  const [expandedActivities, setExpandedActivities] = useState<
    Record<string, boolean>
  >({})

  if (!blocks || blocks.length === 0) return null

  return (
    <section
      className="space-y-12 py-8 grid md:grid-cols-2 gap-6"
      aria-labelledby="activities-heading"
    >
      {blocks.map((block, blockIndex) => (
        <div key={`${block.slug.current}-${blockIndex}`} className="space-y-6">
          <div className="flex gap-2">
            {block.mainImage?.url && (
              <div className="relative aspect-video rounded-xl overflow-hidden flex-1">
                <Image
                  src={block.mainImage.url}
                  alt={block.mainImage.alt || block.title}
                  fill
                  className="object-cover"
                  priority={blockIndex === 0}
                  sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                />
              </div>
            )}
            <header className="space-y-2 flex-2">
              <h2 className="text-xl font-bold text-guarumo-primary">
                {block.title}
              </h2>
              {block.subtitle && (
                <p className="text-lg text-muted-foreground">
                  {block.subtitle}
                </p>
              )}
              {block.description && (
                <p className="text-muted-foreground max-w-3xl">
                  {block.description}
                </p>
              )}
            </header>
          </div>

          <div className="space-y-4 grid md:grid-cols-2 gap-2">
            {block.activities
              .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
              .map((activity, index) => (
                <article
                  key={`${activity.name}-${index}`}
                  className={cn(
                    "border border-border rounded-xl p-5 bg-card transition-all hover:shadow-md",
                    activity.isFeatured && "ring-2 ring-primary/20",
                  )}
                >
                  <div className="flex flex-col md:flex-row md:items-start gap-4">
                    <div className="flex-1 space-y-2">
                      <h3 className="font-semibold text-md text-guarumo-accent">
                        {activity.name}
                      </h3>
                      <div className="flex flex-wrap items-center gap-2">
                        {activity.isFeatured && (
                          <span className="px-2 py-0.5 text-xs font-medium bg-primary/10 text-primary rounded-full">
                            {t("featured", { defaultValue: "Featured" })}
                          </span>
                        )}
                        {activity.season && (
                          <span className="px-2 py-0.5 text-xs font-medium bg-muted text-muted-foreground rounded-full">
                            {seasonLabels[activity.season] || activity.season}
                          </span>
                        )}
                        {activity.difficulty && (
                          <span
                            className={cn(
                              "px-2 py-0.5 text-xs font-medium rounded-full",
                              difficultyColors[activity.difficulty],
                            )}
                          >
                            {difficultyLabels[activity.difficulty] ||
                              activity.difficulty}
                          </span>
                        )}
                      </div>

                      {activity.description && (
                        <div className="relative">
                          <p
                            className={cn(
                              "text-muted-foreground transition-all duration-300",
                              expandedActivities[`${blockIndex}-${index}`]
                                ? ""
                                : "line-clamp-1 overflow-hidden",
                            )}
                          >
                            {activity.description}
                          </p>
                          {activity.description.length > 80 && (
                            <button
                              type="button"
                              onClick={() =>
                                setExpandedActivities(prev => ({
                                  ...prev,
                                  [`${blockIndex}-${index}`]:
                                    !prev[`${blockIndex}-${index}`],
                                }))
                              }
                              className="mt-1 text-sm text-primary hover:text-primary/80 font-medium flex items-center gap-1"
                              aria-expanded={
                                expandedActivities[`${blockIndex}-${index}`] ||
                                false
                              }
                              aria-controls={`activity-desc-${blockIndex}-${index}`}
                            >
                              {expandedActivities[`${blockIndex}-${index}`]
                                ? t("readLess", { defaultValue: "Read less" })
                                : t("readMore", { defaultValue: "Read more" })}
                              <svg
                                className={cn(
                                  "h-4 w-4 transition-transform duration-200",
                                  expandedActivities[`${blockIndex}-${index}`]
                                    ? "rotate-180"
                                    : "",
                                )}
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M19 9l-7 7-7-7"
                                />
                              </svg>
                            </button>
                          )}
                        </div>
                      )}

                      <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                        {activity.duration && (
                          <span className="flex items-center gap-1">
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
                                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                              />
                            </svg>
                            {activity.duration}
                          </span>
                        )}
                        {activity.distanceFromVilla && (
                          <span className="flex items-center gap-1">
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
                                d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z"
                              />
                            </svg>
                            {activity.distanceFromVilla}
                          </span>
                        )}
                        {activity.transportIncluded && (
                          <span className="flex items-center gap-1 text-primary">
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
                                d="M13 17V9m0 0l-2-2m2 2l2-2m-8 10v-4a4 4 0 118 0v4H5v-4a4 4 0 018 0v4h3"
                              />
                            </svg>
                            {t("transportIncluded", {
                              defaultValue: "Transport included",
                            })}
                          </span>
                        )}
                      </div>

                      {activity.highlights &&
                        activity.highlights.length > 0 && (
                          <div className="flex flex-wrap gap-2 pt-2">
                            {activity.highlights.map((highlight, hi) => (
                              <span
                                key={hi}
                                className="px-2 py-1 text-xs bg-muted rounded-full"
                              >
                                {highlight}
                              </span>
                            ))}
                          </div>
                        )}
                    </div>
                  </div>
                </article>
              ))}
          </div>
        </div>
      ))}
    </section>
  )
}
