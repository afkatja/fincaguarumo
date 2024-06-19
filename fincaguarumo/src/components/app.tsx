/**
 * v0 by Vercel.
 * @see https://v0.dev/t/wKg8k6WVz17
 * Documentation: https://v0.dev/docs#integrating-generated-code-into-your-nextjs-app
 */
"use client"

import { useState } from "react"
import Link from "next/link"

import Logo from "./icons/Logo"
import MainNav from "./MainNav"
import translations from "./translations"
import LanguageSelector from "./LanguageSelector"
import Carousel from "./Carousel"
import MobileNav from "./MobileNav"

export default function Component() {
  const [locale, setLocale] = useState("en")
  return (
    <div className="flex flex-col min-h-[100dvh]">
      <header className="bg-background/80 backdrop-blur-sm fixed top-0 left-0 right-0 z-50 border-b border-muted">
        <div className="container flex items-center justify-between h-16 px-4 md:px-6">
          <Link href="#" className="flex items-center gap-2" prefetch={false}>
            <Logo className="w-6 h-6" />
            <span className="font-bold text-lg">Finca Guarumo</span>
          </Link>
          <MainNav locale={locale} />
          <div className="flex items-center gap-2">
            <LanguageSelector
              locale={locale}
              setLocale={val => setLocale(val)}
            />
            <MobileNav locale={locale} />
          </div>
        </div>
      </header>
      <main className="flex-1">
        <section className="w-full">
          <Carousel />
        </section>
        <section className="py-12 md:py-24 lg:py-32">
          <div className="container grid gap-8 px-4 md:px-6">
            <div className="grid gap-4 text-center md:text-left">
              <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
                {translations[locale].hero.title}
              </h2>
              <p className="max-w-[700px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                {translations[locale].hero.description}
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
