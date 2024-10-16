import React from "react"
import Icon from "./Icon"
import { headerIcons } from "./icons"

const Title = ({
  title,
  titleClassName,
  iconClassName,
  icon: iconProp,
  color,
}: {
  title: React.ReactNode
  titleClassName?: string
  iconClassName?: string
  icon?: string
  color?: string
}) => {
  const icons = Object.keys(headerIcons)
  const icon = icons[Math.floor(Math.random() * icons.length)]
  return (
    <h2 className={titleClassName}>
      {icon && (
        <Icon
          icon={iconProp ?? icon}
          size={40}
          className={iconClassName}
          color={color ?? "currentColor"}
        />
      )}
      {title}
    </h2>
  )
}

export default Title
