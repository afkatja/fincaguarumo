import type { Viewport } from "next"

import { Poppins, Comfortaa, Cabin, Didact_Gothic } from "next/font/google"
import "../styles/globals.css"
import "../styles/styles.css"
import { locales } from "../../config"

import React, { Suspense } from "react"

import Header from "../../components/header"
import { VisualEditing } from "next-sanity"
import { draftMode } from "next/headers"
import Footer from "../../components/Footer"
import TransitionProvider from "./providers"

import { BookingProvider } from "./BookingProvider"

import { metadata } from "./meta"
import { i18n } from "../../../languages"

export const meta = metadata

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
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
    <html lang={locale}>
      <body
        className={
          locale === "ru"
            ? `${comfortaa.variable} ${didact.variable}`
            : `${poppins.variable} ${cabin.variable}`
        }
      >
        <TransitionProvider>
          <div className="flex flex-col min-h-[80dvh] animation-container">
            <Suspense>
              <Header locale={locale} />
            </Suspense>
            <BookingProvider>
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
            </BookingProvider>
          </div>
        </TransitionProvider>
        <Footer />
      </body>
    </html>
  )
}
