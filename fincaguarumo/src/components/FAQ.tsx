"use client"

import React, { useEffect, useMemo, useRef, useState } from "react"
import { FAQType } from "../types"
import { ChevronDown, ChevronUp, Search, Link as LinkIcon } from "lucide-react"
import { PortableText } from "next-sanity"
import { portableTextComponents } from "./RichText"
import { Button } from "./ui/button"
import { useTranslations } from "next-intl"

type CategoryMap = Record<string, FAQType[]>

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/&/g, "and")
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
}

function truncateText(text: string, maxLength = 220) {
  if (text.length <= maxLength) return text
  return `${text.slice(0, maxLength).trim()}...`
}

function getFaqText(faq: FAQType) {
  const answerText = typeof faq.answer === "string" ? faq.answer : ""
  const keywordText = Array.isArray(faq.keywords) ? faq.keywords.join(" ") : ""
  return `${faq.question || ""} ${answerText} ${keywordText}`.toLowerCase()
}

function getCategoryKey(faq: FAQType) {
  return faq.category?.slug?.current || "other"
}

function getCategoryTitleFromFaqs(faqs: FAQType[], key: string) {
  const faq = faqs.find(item => getCategoryKey(item) === key)
  return faq?.category?.title || key
}

export default function FAQCategories({ faqs }: { faqs: FAQType[] }) {
  const t = useTranslations("faq")

  const grouped = useMemo(() => {
    return faqs.reduce<CategoryMap>((acc, item) => {
      const key = getCategoryKey(item)
      if (!acc[key]) acc[key] = []
      acc[key].push(item)
      return acc
    }, {})
  }, [faqs])

  const categoryOrder = useMemo(() => {
    return Object.keys(grouped)
  }, [grouped])

  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const [expandedAnswers, setExpandedAnswers] = useState<Set<string>>(new Set())
  const [activeCategory, setActiveCategory] = useState<string>("")

  const categoryRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const questionRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const filterBlockRef = useRef<HTMLDivElement | null>(null)

  const filteredFaqs = useMemo(() => {
    let items = [...faqs]

    if (selectedCategory !== "all") {
      items = items.filter(faq => getCategoryKey(faq) === selectedCategory)
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim()
      items = items.filter(faq => getFaqText(faq).includes(query))
    }

    return items
  }, [faqs, searchQuery, selectedCategory])

  const groupedFiltered = useMemo(() => {
    return filteredFaqs.reduce<CategoryMap>((acc, item) => {
      const key = getCategoryKey(item)
      if (!acc[key]) acc[key] = []
      acc[key].push(item)
      return acc
    }, {})
  }, [filteredFaqs])

  const visibleCategoryOrder = useMemo(() => {
    return categoryOrder.filter(key => groupedFiltered[key]?.length)
  }, [categoryOrder, groupedFiltered])

  useEffect(() => {
    const syncFromHash = () => {
      const hash = window.location.hash.slice(1)
      if (!hash) return

      const faqMatch = faqs.find(faq => faq.slug?.current === hash)
      if (faqMatch) {
        const categoryKey = getCategoryKey(faqMatch)
        setSelectedCategory("all")
        setSearchQuery("")
        setActiveCategory(categoryKey)

        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            const categoryEl = questionRefs.current[hash]
            if (categoryEl && filterBlockRef.current) {
              const filterHeight = filterBlockRef.current.offsetHeight
              const elementTop =
                categoryEl.getBoundingClientRect().top + window.scrollY
              const scrollPosition = elementTop - filterHeight - 70
              window.scrollTo({ top: scrollPosition, behavior: "smooth" })
            }
          })
        })
        return
      }

      const categoryMatch = categoryOrder.find(key => {
        const categorySlug = grouped[key]?.[0]?.category?.slug?.current
        return categorySlug === hash || key === hash
      })

      if (categoryMatch) {
        setSelectedCategory(categoryMatch)
        setSearchQuery("")
        setActiveCategory(categoryMatch)

        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            const categoryEl = categoryRefs.current[categoryMatch]
            if (categoryEl && filterBlockRef.current) {
              const filterHeight = filterBlockRef.current.offsetHeight
              const elementTop =
                categoryEl.getBoundingClientRect().top + window.scrollY
              const scrollPosition = elementTop - filterHeight - 70
              window.scrollTo({ top: scrollPosition, behavior: "smooth" })
            }
          })
        })
      }
    }

    syncFromHash()
    window.addEventListener("hashchange", syncFromHash)
    return () => window.removeEventListener("hashchange", syncFromHash)
  }, [faqs, grouped, categoryOrder])

  useEffect(() => {
    const firstVisible = visibleCategoryOrder[0]
    if (firstVisible) setActiveCategory(firstVisible)
  }, [visibleCategoryOrder])

  const jumpToCategory = (key: string) => {
    setSelectedCategory("all")
    setSearchQuery("")
    setActiveCategory(key)
    const categoryEl = categoryRefs.current[key]
    if (categoryEl && filterBlockRef.current) {
      const filterHeight = filterBlockRef.current.offsetHeight
      const elementTop = categoryEl.getBoundingClientRect().top + window.scrollY
      const scrollPosition = elementTop - filterHeight - 70
      window.scrollTo({ top: scrollPosition, behavior: "smooth" })
    }

    const urlHash = grouped[key]?.[0]?.category?.slug?.current || key
    if (typeof window !== "undefined") {
      history.replaceState(null, "", `#${urlHash}`)
    }
  }

  const toggleAnswer = (slug: string) => {
    setExpandedAnswers(prev => {
      const next = new Set(prev)
      if (next.has(slug)) next.delete(slug)
      else next.add(slug)
      return next
    })
  }

  const clearFilters = () => {
    setSearchQuery("")
    setSelectedCategory("all")
    setActiveCategory("all")
    if (typeof window !== "undefined") {
      history.replaceState(null, "", "?")
    }
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  return (
    <section className="mx-auto max-w-5xl">
      <div
        ref={filterBlockRef}
        className="sticky top-(--header-height-collapsed) z-20 mb-8 bg-zinc-100/90 rounded-md px-4 py-4 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8"
      >
        <p className="mt-3 max-w-2xl text-base leading-7 text-zinc-600">
          {t("browseInstructions")}
        </p>
        <div className="flex flex-col gap-3">
          <label htmlFor="faq-search" className="sr-only">
            {t("searchLabel")}
          </label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <input
              id="faq-search"
              type="search"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder={t("searchPlaceholder")}
              className="w-full rounded-xl border border-zinc-300 bg-white py-3 pl-10 pr-4 text-sm outline-none transition focus:border-guarumo-primary focus:ring-2 focus:ring-guarumo-primary/20"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              type="button"
              onClick={() => setSelectedCategory("all")}
              className={`rounded-full border px-3 py-1.5 text-sm transition ${
                selectedCategory === "all"
                  ? "border-guarumo-primary bg-guarumo-primary text-white"
                  : "border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50"
              }`}
            >
              {t("allCategories")}
            </Button>

            {categoryOrder.map(key => {
              const title = getCategoryTitleFromFaqs(faqs, key)
              return (
                <Button
                  key={key}
                  type="button"
                  onClick={() => jumpToCategory(key)}
                  className={`rounded-full border px-3 py-1.5 text-sm transition ${
                    activeCategory === key
                      ? "border-guarumo-primary bg-guarumo-primary text-white"
                      : "border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50"
                  }`}
                >
                  {title}
                </Button>
              )
            })}

            {(searchQuery ||
              selectedCategory !== "all" ||
              activeCategory !== "all") && (
              <Button
                type="button"
                variant="ghost"
                onClick={clearFilters}
                className="h-9 px-3"
              >
                {t("clearFilters")}
              </Button>
            )}
          </div>
        </div>
      </div>

      {visibleCategoryOrder.length > 0 ? (
        <div className="space-y-12">
          {visibleCategoryOrder.map(key => {
            const items = groupedFiltered[key] || []
            const title = getCategoryTitleFromFaqs(faqs, key)

            return (
              <section
                key={key}
                ref={(el: HTMLDivElement) => {
                  categoryRefs.current[key] = el
                }}
                id={grouped[key]?.[0]?.category?.slug?.current || key}
                className="scroll-mt-28"
              >
                <div className="space-y-4">
                  <h3 className="text-2xl font-semibold tracking-tight text-zinc-900 mb-4">
                    {title}
                  </h3>
                  {items.map(faq => {
                    const slug = faq.slug?.current || slugify(faq.question)
                    const isExpanded = expandedAnswers.has(slug)
                    const fullAnswerText =
                      typeof faq.answer === "string" ? faq.answer : ""
                    const hasLongText = fullAnswerText.length > 220
                    const questionId = slug

                    return (
                      <article
                        key={slug}
                        ref={(el: HTMLDivElement) => {
                          questionRefs.current[slug] = el
                        }}
                        id={questionId}
                        className="scroll-mt-28 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm"
                      >
                        <div className="prose prose-zinc mt-4 max-w-none">
                          <h4 className="text-md font-semibold text-zinc-900">
                            {faq.question}
                          </h4>
                          {faq.answerBlockContent?.length ? (
                            <>
                              {isExpanded ? (
                                <PortableText
                                  value={faq.answerBlockContent}
                                  components={portableTextComponents}
                                />
                              ) : (
                                <div>
                                  <PortableText
                                    value={faq.answerBlockContent.slice(0, 2)}
                                    components={portableTextComponents}
                                  />
                                </div>
                              )}
                            </>
                          ) : (
                            <p className="text-zinc-700">
                              {isExpanded || !hasLongText
                                ? fullAnswerText
                                : truncateText(fullAnswerText)}
                              {(faq.answerBlockContent?.length
                                ? faq.answerBlockContent.length > 2
                                : hasLongText) && (
                                <Button
                                  variant="link"
                                  onClick={() => toggleAnswer(slug)}
                                  className="inline-flex items-center gap-2 text-sm font-medium ml-2"
                                  aria-expanded={isExpanded}
                                  aria-controls={`${questionId}-answer`}
                                >
                                  {isExpanded ? (
                                    <>
                                      {t("readLess")}
                                      <ChevronUp className="h-4 w-4" />
                                    </>
                                  ) : (
                                    <>
                                      {t("readMore")}
                                      <ChevronDown className="h-4 w-4" />
                                    </>
                                  )}
                                </Button>
                              )}
                            </p>
                          )}
                        </div>
                      </article>
                    )
                  })}
                </div>
              </section>
            )
          })}
        </div>
      ) : (
        <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-6 py-10 text-center text-zinc-600">
          {t("noResults")}
        </div>
      )}
    </section>
  )
}
