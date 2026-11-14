import { Metadata } from "next"
import { localeMap } from "@/lib/schema/lodgingBusiness"

export async function generateMetadata({ params }: any): Promise<Metadata> {
  const { locale } = await params

  return {
    title: {
      default: "Finca Guarumo",
      template: "%s | Finca Guarumo",
    },
    metadataBase: new URL("https://fincaguarumo.com"),
    description:
      "Stay at Villa Bruno on Finca Guarumo – a private eco-luxury villa in Costa Rica's Osa Peninsula. Explore jungle trails, birdwatching, and rural life near Corcovado National Park.",
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
          alt: "Villa Bruno, an eco-villa at Finca Guarumo, Osa Peninsula, Costa Rica — solar-powered sustainable accommodation near Corcovado National Park, birdwatching and jungle trails",
        },
      ],
      type: "website",
      locale: localeMap[locale] || "en_US",
      siteName: "Finca Guarumo",
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
          alt: "Villa Bruno, an eco-villa at Finca Guarumo, Osa Peninsula, Costa Rica — solar-powered sustainable accommodation near Corcovado National Park, birdwatching and jungle trails",
        },
      ],
    },
    other: {
      "og:locale": localeMap[locale] || "en_US",
    },
  }
}
