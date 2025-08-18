import type { Viewport } from "next"
import { draftMode } from "next/headers"
import { NextIntlClientProvider } from "next-intl"
import { VisualEditing } from "next-sanity"

import { Poppins, Comfortaa, Cabin, Didact_Gothic } from "next/font/google"

import "../styles/globals.css"
import "../styles/styles.css"
import "react-day-picker/style.css"

import { locales } from "../../config"

import Footer from "../../components/Footer"
import TransitionProvider from "./providers"

import { BookingProvider } from "./BookingProvider"
import { DialogProvider } from "./DialogProvider"

import { metadata as meta } from "./meta"
import { i18n } from "../../../languages"
import Header from "../../components/header"
import { cn } from "../../lib/utils"
import Script from "next/script"

export const metadata = meta

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
}

const poppins = Poppins({
  weight: "500",
  subsets: ["latin"],
  display: "swap",
  variable: "--font-poppins",
})
const comfortaa = Comfortaa({
  weight: "700",
  subsets: ["cyrillic"],
  display: "swap",
  variable: "--font-comfortaa",
})
const cabin = Cabin({
  weight: ["400", "600", "700"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-cabin",
})
const didact = Didact_Gothic({
  subsets: ["cyrillic"],
  display: "swap",
  variable: "--font-didact",
  weight: "400",
})
export function generateStaticParams() {
  return locales.map(locale => ({ locale }))
}

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "LodgingBusiness",
  name: "Villa Bruno at Finca Guarumo",
  description:
    "Eco-luxury jungle villa on a sustainable farm near Corcovado, Costa Rica. Perfect for birdwatchers, nature lovers, and eco-travelers.",
  image: "https://fincaguarumo.com/images/finca-guarumo-v4.4.jpg",
  url: "https://fincaguarumo.com",
  address: {
    "@type": "PostalAddress",
    addressCountry: "CR",
    addressRegion: "Puntarenas",
    addressLocality: "Puerto Jiménez",
  },
  geo: {
    "@type": "GeoCoordinates",
    latitude: 8.538,
    longitude: -83.307,
  },
  amenityFeature: [
    {
      "@type": "LocationFeatureSpecification",
      name: "Birdwatching",
      value: true,
    },
    {
      "@type": "LocationFeatureSpecification",
      name: "Hiking Trails",
      value: true,
    },
    {
      "@type": "LocationFeatureSpecification",
      name: "Eco-friendly",
      value: true,
    },
  ],
  sameAs: [
    "https://www.instagram.com/fincaguarumo.osa",
    "https://www.facebook.com/fincaguarumoosa",
  ],
}

export default async function Layout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode
  params?: any
}>) {
  const { locale = "en" } = (await params) || {}
  if (!i18n.languages.map(lang => lang.id).includes(locale)) return null

  const draft = await draftMode()
  const baseUrl = "https://fincaguarumo.com"

  return (
    <html lang={locale} data-scroll-behavior="smooth">
      <body
        className={cn(
          locale === "ru"
            ? `${comfortaa.variable} ${didact.variable}`
            : `${poppins.variable} ${cabin.variable}`,
          "min-h-[100vh]"
        )}
      >
        <NextIntlClientProvider locale={locale}>
          <TransitionProvider>
            <div className="flex flex-col min-h-[calc(100dvh-var(--header-height))] animation-container">
              <Header locale={locale} />

              <BookingProvider>
                <DialogProvider>
                  <main className="flex-1 flex flex-col">
                    {draft?.isEnabled && (
                      <a
                        className="fixed right-0 bottom-0 bg-blue-500 text-zinc-50 p-4 m-4"
                        href="/api/draft-mode/disable"
                      >
                        Disable preview mode
                      </a>
                    )}
                    {children} {draft?.isEnabled && <VisualEditing />}
                  </main>
                </DialogProvider>
              </BookingProvider>
            </div>
          </TransitionProvider>
          <Footer />
        </NextIntlClientProvider>
        <Script
          id="json-ld"
          strategy="afterInteractive"
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
          }}
        />
      </body>
    </html>
  )
}
