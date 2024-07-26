import Link from "next/link"
import React from "react"
import Logo from "./icons/Logo"
import MainNav from "./MainNav"
import LanguageSelector from "./LanguageSelector"
import MobileNav from "./MobileNav"

const Header = ({ locale }: { locale: string }) => {
  return (
    <header className="main-header bg-background/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="flex items-center justify-between nav w-11/12 mx-auto">
        <Link href="/" className="block py-3 h-full logo-link" prefetch={false}>
          <Logo className="logo" />
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
