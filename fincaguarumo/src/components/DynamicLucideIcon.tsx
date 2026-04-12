import {
  HelpCircle,
  Sun,
  Binoculars,
  Droplet,
  Mountain,
  Wifi,
  Car,
  Coffee,
  Utensils,
  Trees,
  Waves,
  Home,
  MapPin,
  Clock,
  Calendar,
  Users,
  Bed,
  Bath,
  Wind,
  Zap,
  Shield,
  Heart,
  Star,
  Check,
  X,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  ArrowDown,
  ArrowUp,
  ArrowLeft,
  ArrowRight,
} from "lucide-react"

interface DynamicLucideIconProps {
  icon: string
  className?: string
  size?: number
  color?: string
}

export const ICON_MAP = {
  HelpCircle,
  Sun,
  Binoculars,
  Droplet,
  Mountain,
  Wifi,
  Car,
  Coffee,
  Utensils,
  Trees,
  Waves,
  Home,
  MapPin,
  Clock,
  Calendar,
  Users,
  Bed,
  Bath,
  Wind,
  Zap,
  Shield,
  Heart,
  Star,
  Check,
  X,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  ArrowDown,
  ArrowUp,
  ArrowLeft,
  ArrowRight,
}

export const DynamicLucideIcon = ({
  icon,
  className,
  size = 24,
  color = "currentColor",
}: DynamicLucideIconProps) => {
  // Normalize icon name to PascalCase (handle kebab-case, snake_case, camelCase)
  const normalizeIconName = (iconName: string) => {
    return iconName
      .split(/[-_]/) // Split on hyphens and underscores
      .map(
        segment =>
          segment.charAt(0).toUpperCase() + segment.slice(1).toLowerCase(),
      )
      .join("")
  }

  const normalizedIconName = normalizeIconName(icon)
  const IconComponent =
    ICON_MAP[normalizedIconName as keyof typeof ICON_MAP] || HelpCircle

  return <IconComponent className={className} size={size} color={color} />
}
