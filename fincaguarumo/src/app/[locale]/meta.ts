import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Finca Guarumo",
  description:
    "Bosque de aves - A sustainable jungle farm in Costa Rica offering an eco-villa, rural tours, and wildlife experiences near Corcovado.",
  keywords:
    "birdwatching, hiking, rural tours, jungle, aves, naturaleza, nature, eco-tourism, sustainability, sostenibilidad, sustainable tourism, Corcovado, Osa Peninsula, Peninsula de Osa, Costa Rica",
  icons: {
    icon: "/favicon/icon.ico",
    apple: "/favicon/apple-touch-icon.png",
    shortcut: "/favicon/safari-pinned-tab.svg",
  },
  robots: "index, follow",
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
}
