"use client"
import React, { useMemo, useState } from "react"
import { FAQType } from "../types"
import { ChevronDown, ChevronUp } from "lucide-react"

/**
 * Render a single FAQ item.
 * @param {{ faq: FAQType }} props - An object containing the FAQ item to render.
 * @returns {JSX.Element} A JSX element representing the FAQ item.
 */
export default function FAQCategories({ faqs }: { faqs: FAQType[] }) {
  const grouped = useMemo(() => {
    return faqs.reduce<Record<string, FAQType[]>>((acc, item) => {
      const key = item.category || "other"
      if (!acc[key]) acc[key] = []
      acc[key].push(item)
      return acc
    }, {})
  }, [faqs])

  const [openKey, setOpenKey] = useState<string | null>(null)

  const prettyTitle = (key: string) => {
    switch (key) {
      case "power":
        return "Power & Connectivity"
      case "location":
        return "Location & Access"
      case "wildlife":
        return "Wildlife & Safety"
      case "amenities":
        return "Amenities & Comfort"
      case "weather":
        return "Weather & Seasons"
      default:
        return key
    }
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 items-start">
      {Object.entries(grouped).map(([key, items]) => {
        const isOpen = openKey === key

        return (
          <div
            key={key}
            className="rounded-xl border border-zinc-200 bg-zinc-50 shadow-sm overflow-hidden transition-all"
          >
            <button
              name="faq-category-button"
              className="w-full text-left p-5 bg-zinc-50 hover:bg-zinc-100 transition-colors flex items-center justify-between"
              onClick={() => setOpenKey(prev => (prev === key ? null : key))}
              aria-expanded={isOpen}
              aria-controls={`panel-${key}`}
            >
              <span className="text-lg font-semibold text-zinc-900">
                {prettyTitle(key)}
              </span>
              {!isOpen ? (
                <ChevronDown className="w-6 h-6 text-zinc-400" />
              ) : (
                <ChevronUp className="w-6 h-6 text-zinc-400" />
              )}
            </button>
            <div
              id={`panel-${key}`}
              className={`transition-[max-height] duration-300 ease-in-out ${isOpen ? "max-h-[2000px]" : "max-h-0 overflow-hidden"}`}
            >
              <div className="p-5 border-t border-zinc-200">
                <ul className="space-y-4 list-none p-0">
                  {items.map(faq => (
                    <li key={faq.slug.current}>
                      <dl className="my-0">
                        <dt className="text-xl font-bold text-guarumo-primary">
                          {faq.question}
                        </dt>
                        <dd className="text-zinc-800 mt-1 pl-0">
                          {faq.answer}
                        </dd>
                      </dl>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
