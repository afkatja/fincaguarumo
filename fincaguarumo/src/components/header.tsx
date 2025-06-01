import React from "react"
import MainNav from "./MainNav"
import LanguageSelector from "./LanguageSelector"
import MobileNav from "./MobileNav"
import UtilsNav from "./UtilsNav"
import SocialNav from "./SocialNav"
import { i18n } from "../../languages"
import navigation from "../lib/navigation"
import Logo from "./Logo"

const Header = async ({
  locale,
  ...props
}: {
  locale: string
  [prop: string]: any
}) => {
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
    <header
      className="main-header bg-background/80 backdrop-blur-sm sticky top-0 z-50"
      {...props}
    >
      <div className="flex items-center justify-between nav w-11/12 mx-auto">
        <Logo />
        <MainNav className="mx-5" navItems={mainNav} />
        <div className="flex items-center gap-2 ml-auto">
          <UtilsNav navItems={utilsNav} />
          <SocialNav className="md:hidden" />
          <LanguageSelector locale={locale} translations={languages} />
          <MobileNav navItems={navItems} />
        </div>
      </div>
    </header>
  )
}

export default Header
