import React from "react"

import icons from "./icons"

const ICONS: any = Object.keys(icons).reduce(
  (_icons, iconName) => ({
    ..._icons,
    [iconName]: (icons as any)[iconName],
  }),
  {}
)

const Icon = ({
  color,
  icon,
  alt,
  className,
  size,
}: {
  color?: string
  icon: string
  alt?: string
  className?: string
  size?: number
}) => {
  const Component = ICONS[icon]

  return (
    <Component
      color={color}
      title={alt}
      className={className}
      width={size}
      height={size}
    />
  )
}

export default Icon
