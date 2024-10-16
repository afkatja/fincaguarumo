import React from "react"

import icons from "./icons"

export const ICONS: any = Object.keys(icons).reduce(
  (_icons, iconName) => ({
    ..._icons,
    [iconName]: (icons as any)[iconName],
  }),
  {}
)

export enum IconColor {
  Primary = "primary",
  Secondary = "secondary",
}

const colors = {
  get icon() {
    return {
      primary: this.primary,
      secondary: this.secondary,
    } as any
  },
  primary: "#034924",
  secondary: "#9e1f60",
}

const isType = (x: any): x is IconColor => Object.values(IconColor).includes(x)

const Icon = ({
  color,
  icon,
  alt,
  className,
  size,
}: {
  color?: IconColor | string
  icon: string
  alt?: string
  className?: string
  size?: number
}) => {
  if (!ICONS[icon]) return `no such icon ${icon}`

  const Component = ICONS[icon]
  const getColor = () => {
    if (!color) return "#000000"
    if (!isType(color)) return color

    return colors.icon[color]
  }
  return (
    <Component
      color={getColor()}
      title={alt ?? icon}
      className={className}
      width={size}
      height={size}
    />
  )
}

export default Icon
