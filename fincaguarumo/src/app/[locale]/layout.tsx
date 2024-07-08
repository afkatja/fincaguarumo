// import type { Metadata } from "next"

// export const metadata: Metadata = {
//   title: "Finca Guarumo",
//   description: "Bosque de aves",
// }

import { Poppins } from "next/font/google"
import { Cabin } from "next/font/google"
import "../globals.css"
import "../styles.css"
import { locales } from "../../config"

import React from "react"
import { NextIntlClientProvider } from "next-intl"
import { getMessages, unstable_setRequestLocale } from "next-intl/server"

import Header from "../../components/header"

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
  const messages = await getMessages()
  unstable_setRequestLocale(locale)

  return (
    <html lang={locale}>
      <body className={poppins.variable + " " + cabin.variable}>
        <NextIntlClientProvider messages={messages}>
          <div className="flex flex-col min-h-[100dvh]">
            <Header locale={locale} />
            <main className="flex-1">{children}</main>
          </div>
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
