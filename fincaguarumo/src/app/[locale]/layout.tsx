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

import { BookingProvider } from "../providers/BookingProvider"
import { DialogProvider } from "../providers/DialogProvider"

import { generateMetadata } from "./meta"
import { i18n } from "../../../languages"
import Header from "../../components/header"
import { cn } from "../../lib/utils"
import Script from "next/script"
import { jsonLd, orgSchema } from "../../lib/json-ld"

export { generateMetadata }

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

  return (
    <html lang={locale} data-scroll-behavior="smooth" suppressHydrationWarning>
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
              <BookingProvider>
                <DialogProvider locale={locale}>
                  <Header locale={locale} />
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
        <Script
          id="json-ld-org"
          strategy="afterInteractive"
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(orgSchema).replace(/</g, "\\u003c"),
          }}
        />
      </body>
    </html>
  )
}
