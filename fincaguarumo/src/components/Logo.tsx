import React from "react"
import Link from "next/link"
import Icon from "./Icon"

const Logo = () => {
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
