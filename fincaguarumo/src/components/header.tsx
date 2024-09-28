import Link from "next/link"
import React from "react"
import MainNav from "./MainNav"
import LanguageSelector from "./LanguageSelector"
import MobileNav from "./MobileNav"
import UtilsNav from "./UtilsNav"
import Icon from "./Icon"
import SocialNav from "./SocialNav"
import { i18n } from "../../languages"
import navigation from "../lib/navigation"

const Header = async ({ locale }: { locale: string }) => {
  const languages = i18n.languages.map(lang => {
    return {
      ...lang,
      language: lang.id,
      path: `/${lang.id}`,
    }
  })

  const nav = await navigation({ locale })
  const { navItems, main: mainNav, utils: utilsNav } = nav || {}
  return (
    <header className="main-header bg-background/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="flex items-center justify-between nav w-11/12 mx-auto">
        <Link href="/" className="block py-3 h-full logo-link" prefetch={false}>
          <Icon icon="Logo" className="logo" size={100} />
        </Link>
        <MainNav className="mx-5" navItems={mainNav} />
        <div className="flex items-center gap-2 ml-auto">
          <UtilsNav navItems={utilsNav} />
          <SocialNav />
          <LanguageSelector locale={locale} translations={languages} />
          <MobileNav navItems={navItems} />
        </div>
      </div>
    </header>
  )
}

export default Header
