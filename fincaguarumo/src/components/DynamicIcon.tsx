import * as Icons from "lucide-react"

// Create a type-safe icon mapping
const iconMap = {
  Sun: Icons.Sun,
  Binoculars: Icons.Binoculars,
  Droplet: Icons.Droplet,
  Mountain: Icons.Mountain,
  DollarSign: Icons.DollarSign,
  Home: Icons.Home,
  Users: Icons.Users,
  MapPin: Icons.MapPin,
  Clock: Icons.Clock,
  Star: Icons.Star,
  // Add more icons as needed
}

type IconName = keyof typeof iconMap

interface DynamicIconProps {
  icon: IconName | string
  className?: string
  size?: number
  color?: string
}

export const DynamicIcon = ({ icon, className, size = 24, color = "currentColor" }: DynamicIconProps) => {
  const IconComponent = iconMap[icon as IconName]
  
  if (!IconComponent) {
    console.warn(`Icon "${icon}" not found in iconMap`)
    return <div className={className} style={{ width: size, height: size }} />
  }
  
  return <IconComponent className={className} size={size} color={color} />
}

// For use in your components
export const renderFeatureIcon = (feature: { icon: string }) => {
  return <DynamicIcon icon={feature.icon} className="h-6 w-6" />
}
