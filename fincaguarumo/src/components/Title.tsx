"use client"
import React, { useMemo } from "react"
import Icon from "./Icon"
import { headerIcons } from "./icons"

interface ITitle {
  Heading?: React.ElementType<{ className?: string }>
  title: React.ReactNode
  titleClassName?: string
  icon?: {
    title?: string
    iconClassName?: string
    size?: number
    color?: string
  }
}

const Title = React.memo(
  ({ title, titleClassName, Heading = "h2", icon: iconProp = {} }: ITitle) => {
    const {
      iconClassName = "",
      size = 40,
      title: iconTitle,
      color = "currentColor",
    } = iconProp

    const icon = useMemo(() => {
      const icons = Object.keys(headerIcons)
      return icons[Math.floor(Math.random() * icons.length)]
    }, [])

    return (
      <Heading className={titleClassName}>
        {!!Object.keys(iconProp).length && (
          <Icon
            icon={iconTitle ?? icon}
            size={size}
            className={`inline mr-4 ${iconClassName}`}
            color={color}
          />
        )}
        {title}
      </Heading>
    )
  }
)

Title.displayName = "Title"

export default Title
