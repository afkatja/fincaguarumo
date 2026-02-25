import dynamic from "next/dynamic"
import * as Icons from "lucide-react"

interface DynamicLucideIconProps {
  icon: string
  className?: string
  size?: number
  color?: string
}

export const DynamicLucideIcon = ({
  icon,
  className,
  size = 24,
  color = "currentColor",
}: DynamicLucideIconProps) => {
  // Convert icon name to PascalCase
  const iconName = icon.charAt(0).toUpperCase() + icon.slice(1)
  const IconComponent = (Icons as any)[iconName] || Icons.HelpCircle

  return <IconComponent className={className} size={size} color={color} />
}
