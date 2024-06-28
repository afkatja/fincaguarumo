import Link from "next/link"
import React from "react"
import Logo from "./icons/Logo"
import MainNav from "./MainNav"
import LanguageSelector from "./LanguageSelector"
import MobileNav from "./MobileNav"

const Header = ({ locale }: { locale: string }) => {
  return (
    <header className="bg-background/80 backdrop-blur-sm sticky top-0 left-0 right-0 z-50 border-b border-muted">
      <div className="flex items-center justify-between h-16 px-4 md:px-6">
        <Link href="/" className="flex items-center gap-2" prefetch={false}>
          <Logo />
        </Link>
        <MainNav locale={locale} className="mx-5" />
        <div className="flex items-center gap-2 ml-auto">
          <LanguageSelector locale={locale} />
          <MobileNav locale={locale} />
        </div>
      </div>
    </header>
  )
}

export default Header
