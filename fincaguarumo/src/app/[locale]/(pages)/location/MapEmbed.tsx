"use client"

import { useTranslations } from "next-intl"

interface MapEmbedProps {
  coordinates?: { lat: number; lng: number } | null
  googleMapsUrl?: string
  appleMapsUrl?: string
  wazeUrl?: string
  address?: {
    formatted?: string
    street?: string
    city?: string
    region?: string
    country?: string
    postalCode?: string
  }
}

export default function MapEmbed({
  coordinates,
  googleMapsUrl,
  appleMapsUrl,
  wazeUrl,
  address,
}: MapEmbedProps) {
  const t = useTranslations("location")

  const lat = coordinates?.lat ?? 8.496420632614996
  const lng = coordinates?.lng ?? -83.3341457939961

  const embedUrl = `https://www.google.com/maps/embed/v1/place?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ""}&q=${lat},${lng}&zoom=14&maptype=satellite`

  const fallbackGoogleMapsUrl = googleMapsUrl || `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`
  const fallbackAppleMapsUrl = appleMapsUrl || `https://maps.apple.com/?ll=${lat},${lng}&q=Villa%20Bruno%20Finca%20Guarumo`
  const fallbackWazeUrl = wazeUrl || `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`

  return (
    <div className="space-y-4">
      <div className="aspect-video w-full rounded-xl overflow-hidden border border-border bg-muted">
        {process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ? (
          <iframe
            title="Villa Bruno at Finca Guarumo Location"
            src={embedUrl}
            style={{ border: 0, width: "100%", height: "100%" }}
            allowFullScreen
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full p-6 text-center bg-muted/50">
            <p className="text-muted-foreground mb-4">
              {t("mapUnavailable", { defaultValue: "Interactive map requires API key configuration" })}
            </p>
            <a
              href={fallbackGoogleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {t("openInGoogleMaps", { defaultValue: "Open in Google Maps" })}
            </a>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-3">
        <a
          href={fallbackGoogleMapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors"
        >
          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
          </svg>
          {t("googleMaps", { defaultValue: "Google Maps" })}
        </a>
        <a
          href={fallbackAppleMapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors"
        >
          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
          </svg>
          {t("appleMaps", { defaultValue: "Apple Maps" })}
        </a>
        <a
          href={fallbackWazeUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors"
        >
          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
          </svg>
          {t("waze", { defaultValue: "Waze" })}
        </a>
      </div>

      {address?.formatted && (
        <p className="text-sm text-muted-foreground font-mono">
          {address.formatted}
        </p>
      )}
    </div>
  )
}