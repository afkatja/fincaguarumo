"use client"
import React from "react"
import Link from "next/link"
import Icon from "./Icon"
import dynamic from "next/dynamic"
import resolveConfig from "tailwindcss/resolveConfig"
import tailwindConfig from "../../tailwind.config"
const MediaQuery = dynamic(() => import("react-responsive"), {
  ssr: false,
})

const Logo = () => {
  const { theme } = resolveConfig(tailwindConfig)
  const primaryColor = theme.colors.guarumo.primary

  return (
    <Link href="/" className="block py-3 h-full logo-link" prefetch>
      <MediaQuery query="(prefers-color-scheme: dark)">
        {isDark => (
          <Icon
            icon="Logo"
            className="logo"
            size={100}
            color={isDark ? "#ffffff" : primaryColor}
          />
        )}
      </MediaQuery>
    </Link>
  )
}

export default Logo
