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

import { metadata as meta } from "./meta"
import { i18n } from "../../../languages"
import Header from "../../components/header"
import { cn } from "../../lib/utils"
import Head from "next/head"

export const metadata = meta

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
  const baseUrl = "https://fincaguarumo.com"

  return (
    <html lang={locale} data-scroll-behavior="smooth">
      <Head>
        {i18n.languages.map(({ id }) => (
          <link
            key={id}
            rel="alternate"
            hrefLang={id}
            href={`${baseUrl}/${id}/`}
          />
        ))}
        {/* Optionally, add x-default */}
        <link rel="alternate" hrefLang="x-default" href={`${baseUrl}/en/`} />
      </Head>
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
              <main className="flex flex-col flex-1">{children}</main>
              {draft?.isEnabled && (
                <a
                  className="fixed right-0 bottom-0 bg-blue-500 text-zinc-50 p-4 m-4"
                  href="/api/draft-mode/disable"
                >
                  Disable preview mode
                </a>
              )}
              {draft?.isEnabled && <VisualEditing />}
            </div>
          </TransitionProvider>
          <Footer />
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
