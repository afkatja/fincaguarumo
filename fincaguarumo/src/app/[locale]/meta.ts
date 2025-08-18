import { Metadata } from "next"
import { i18n } from "../../../languages"

const baseUrl = "https://fincaguarumo.com"
export const metadata: Metadata = {
  title: "Finca Guarumo",
  metadataBase: new URL("https://fincaguarumo.com"),
  description:
    "Stay at Villa Bruno in Finca Guarumo – a private eco-luxury villa in Costa Rica’s Osa Peninsula. Explore jungle trails, birdwatching, and rural life near Corcovado National Park.",
  keywords:
    `birdwatching, hiking, jungle, nature, eco-tourism, sustainability, Corcovado, Osa Peninsula, Costa Rica, Villa Bruno, eco-luxury, sustainable travel, ecoturismo, turismo sostenible, turismo rural, finca guarumo, vacation rental, airbnb, luxury jungle retreat Costa Rica, rainforest villa, secluded villa Costa Rica, eco-lodge near Corcovado, birdwatching Osa Peninsula, nature photography Costa Rica, eco-friendly villa Costa Rica, regenerative tourism Costa Rica, rural tourism Osa Peninsula, guided nature walks Costa Rica, organic farm Costa Rica stay, nature immersion Costa Rica, near Corcovado National Park, Puerto Jimenez villa rental, villa near Golfo Dulce, romantic jungle getaway Costa Rica, peaceful nature retreat Costa Rica`
      .split(",")
      .map(k => k.trim())
      .filter(Boolean),
  icons: {
    icon: "/favicon/icon.ico",
    apple: "/favicon/apple-touch-icon.png",
    shortcut: "/favicon/safari-pinned-tab.svg",
  },
  robots: "index, follow",
  alternates: {
    languages: Object.fromEntries(
      i18n.languages.map(({ id }) => [id, `${baseUrl}/${id}/`])
    ),
    canonical: `${baseUrl}/en/`,
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
        alt: "Finca Guarumo",
      },
    ],
    type: "website",
    locale: "en_US",
    alternateLocale: ["es_CR", "ru_RU", "nl_NL", "de_DE"],
    siteName: "Finca Guarumo",
    url: "https://fincaguarumo.com",
    countryName: "Costa Rica",
  },
  twitter: {
    card: "summary_large_image",
    site: "@fincaguarumo", // if you have a Twitter/X account
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
}
