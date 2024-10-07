import React from "react"
import Icon from "./Icon"
import { headerIcons } from "./icons"

const Title = ({
  title,
  titleClassName,
  iconClassName,
}: {
  title: string
  titleClassName: string
  iconClassName: string
}) => {
  const icons = Object.keys(headerIcons)
  const icon = icons[Math.floor(Math.random() * icons.length)]
  return (
    <h2 className={titleClassName}>
      {icon && (
        <Icon
          icon={icon}
          size={40}
          className={iconClassName}
          color="currentColor"
        />
      )}
      {title}
    </h2>
  )
}

export default Title
