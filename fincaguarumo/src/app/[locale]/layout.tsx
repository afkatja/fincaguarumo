import type { Metadata, Viewport } from "next"

export const metadata: Metadata = {
  title: "Finca Guarumo",
  description: "Bosque de aves",
  icons: {
    icon: "/favicon/favicon.ico",
    apple: "/favicon/apple-touch-icon.png",
    shortcut: "/favicon/safari-pinned-tab.svg",
  },
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

import { Poppins } from "next/font/google"
import { Cabin } from "next/font/google"
import "../styles/globals.css"
import "../styles/styles.css"
import { locales } from "../../config"

import React from "react"
// import { NextIntlClientProvider } from "next-intl"
// import { getMessages, unstable_setRequestLocale } from "next-intl/server"

import Header from "../../components/header"
import { VisualEditing } from "next-sanity"
import { draftMode } from "next/headers"

const poppins = Poppins({
  weight: "300",
  subsets: ["latin"],
  display: "swap",
  variable: "--font-poppins",
})
const cabin = Cabin({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-cabin",
})
export function generateStaticParams() {
  return locales.map(locale => ({ locale }))
}

export default async function Layout({
  children,
  params: { locale },
}: Readonly<{
  children: React.ReactNode
  params?: any
}>) {
  // const messages = await getMessages()
  // unstable_setRequestLocale(locale)

  return (
    <html lang={locale}>
      <body className={poppins.variable + " " + cabin.variable}>
        {/* <NextIntlClientProvider messages={messages}> */}
        <div className="flex flex-col min-h-[100dvh]">
          <Header locale={locale} />
          <main className="flex-1">
            {draftMode().isEnabled && (
              <a
                className="fixed right-0 bottom-0 bg-blue-500 text-white p-4 m-4"
                href="/api/draft-mode/disable"
              >
                Disable preview mode
              </a>
            )}
            {children} {draftMode().isEnabled && <VisualEditing />}
          </main>
        </div>
        {/* </NextIntlClientProvider> */}
      </body>
    </html>
  )
}
