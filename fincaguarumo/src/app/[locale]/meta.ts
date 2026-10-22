import { Metadata } from "next"
import { locales } from "../../config"
import { getLocalizedUrl } from "@/lib/url"

const localeMap: Record<string, string> = {
  en: "en_US",
  es: "es_CR",
  de: "de_DE",
  nl: "nl_NL",
  ru: "ru_RU",
}

export async function generateMetadata({ params }: any): Promise<Metadata> {
  const { locale, pathname } = await params

  const currentPath = pathname || "/"
  const isHomepage = currentPath === "/"

  // Build canonical URL using locale-aware helper
  const canonicalUrl = getLocalizedUrl(currentPath, locale)

  // Build hreflang alternates - only include locales that actually have content
  // For now, only English has full content; others fall back to English
  // TODO: Add other locales when translations are complete
  const alternates: Record<string, string> = {
    "x-default": getLocalizedUrl(currentPath, "en"),
    [locale]: canonicalUrl,
  }

  return {
    title: {
      default: "Finca Guarumo",
      template: "%s | Finca Guarumo",
    },
    metadataBase: new URL("https://fincaguarumo.com"),
    description:
      "Stay at Villa Bruno in Finca Guarumo – a private eco-luxury villa in Costa Rica's Osa Peninsula. Explore jungle trails, birdwatching, and rural life near Corcovado National Park.",
    icons: {
      icon: "/favicon/icon.ico",
      apple: "/favicon/apple-touch-icon.png",
      shortcut: "/favicon/safari-pinned-tab.svg",
    },
    robots: "index, follow",
    alternates: {
      canonical: canonicalUrl,
      languages: alternates,
    },
    openGraph: {
      title: "Finca Guarumo",
      description:
        "Bosque de aves - A sustainable jungle farm in Costa Rica offering an eco-villa, rural tours, and wildlife experiences near Corcovado.",
      images: [
        {
          url: "/images/finca-guarumo-v4.4.jpg",
          width: 1200,
          height: 630,
          alt: "Finca Guarumo - Eco-Villa in Costa Rica's Osa Peninsula",
        },
      ],
      type: "website",
      locale: localeMap[locale] || "en_US",
      siteName: "Finca Guarumo",
      url: canonicalUrl,
      countryName: "Costa Rica",
    },
    twitter: {
      card: "summary_large_image",
      site: "@fincaguarumo",
      title: "Finca Guarumo – Eco-Villa & Birding Paradise in Costa Rica",
      description:
        "Stay at Villa Bruno in the Osa Peninsula. A sustainable jungle experience with birds, wildlife, rural tours, and Corcovado nearby.",
      images: [
        {
          url: "/images/finca-guarumo-v4.4.jpg",
          alt: "Finca Guarumo – Villa Bruno jungle view",
        },
      ],
    },
    other: {
      "og:locale": localeMap[locale] || "en_US",
    },
  }
}