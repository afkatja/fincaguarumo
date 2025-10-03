import React from "react"
import { createNavigation } from "next-intl/navigation"
import Icon from "./Icon"

const Logo = () => {
  const { Link } = createNavigation()
  return (
    <Link href="/" className="block py-3 h-full logo-link" prefetch>
      <Icon
        icon="Logo"
        className="logo fill-guarumo-primary dark:fill-zinc-50"
        size={100}
      />
    </Link>
  )
}

export default Logo
