"use client"

import { useTranslations } from "next-intl"

interface TransportItem {
  name: string
  type: string
  description?: string
  contact?: string
  website?: string
  languages?: string[]
}

interface LocalTransportProps {
  transport: TransportItem[]
}

const typeLabels: Record<string, string> = {
  taxi: "Taxi",
  shuttle: "Shuttle",
  "rental-car": "Rental Car",
  "tour-operator": "Tour Operator",
  bike: "Bicycle / Scooter Rental",
}

const typeIcons: Record<string, React.ReactNode> = {
  taxi: (
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
  ),
  shuttle: (
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
        d="M19 17V9m0 0l-2-2m2 2l2-2m-8 10v-4a4 4 0 118 0v4H5v-4a4 4 0 018 0v4h3"
      />
    </svg>
  ),
  "rental-car": (
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
        d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z"
      />
    </svg>
  ),
  "tour-operator": (
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
        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
      />
    </svg>
  ),
  bike: (
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
        d="M15.182 16.318a3 3 0 00-4.243 0l-1.828 1.828a3 3 0 01-4.243 0L3 12.318a3 3 0 010-4.243L4.757 6.243a3 3 0 014.243 0l1.828 1.828a3 3 0 004.243 0l3.314-3.314a3 3 0 014.243 0l1.954 1.954a3 3 0 010 4.243l-1.828 1.828z"
      />
    </svg>
  ),
}

export default function LocalTransport({ transport }: LocalTransportProps) {
  const t = useTranslations("location")
  if (!transport || transport.length === 0) {
    return (
      <p className="text-muted-foreground">
        {t("noTransport", {
          defaultValue: "No local transport options listed",
        })}
      </p>
    )
  }

  return (
    <div className="space-y-4">
      {transport.map((item, index) => (
        <article
          key={`${item.name}-${index}`}
          className="border border-border rounded-xl p-5 bg-card hover:shadow-md transition-shadow"
        >
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              {typeIcons[item.type] || typeIcons["tour-operator"]}
            </div>
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-3">
                <h4 className="font-semibold">{item.name}</h4>
                <span className="px-2 py-1 text-xs font-medium bg-muted text-muted-foreground rounded-full">
                  {typeLabels[item.type] || item.type}
                </span>
              </div>
              {item.description && (
                <p className="text-muted-foreground">{item.description}</p>
              )}
              <div className="flex flex-wrap items-center gap-3 text-sm">
                {item.contact && (
                  <a
                    href={
                      item.contact.startsWith("http")
                        ? item.contact
                        : `tel:${item.contact.replace(/\s+/g, "")}`
                    }
                    className="flex items-center gap-1 text-muted-foreground hover:text-primary transition-colors"
                  >
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
                        d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                      />
                    </svg>
                    <span>{item.contact}</span>
                  </a>
                )}
                {item.website && (
                  <a
                    href={item.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-muted-foreground hover:text-primary transition-colors"
                  >
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
                        d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                      />
                    </svg>
                    <span>{t("website", { defaultValue: "Website" })}</span>
                  </a>
                )}
                {item.languages && item.languages.length > 0 && (
                  <span className="flex items-center gap-1 text-muted-foreground">
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
                        d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                      />
                    </svg>
                    <span className="flex items-center gap-1">
                      {item.languages.map((lang, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 text-xs bg-muted rounded"
                        >
                          {lang}
                        </span>
                      ))}
                    </span>
                  </span>
                )}
              </div>
            </div>
          </div>
        </article>
      ))}
    </div>
  )
}
