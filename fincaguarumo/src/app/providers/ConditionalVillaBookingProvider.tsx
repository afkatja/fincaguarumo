"use client"

import { usePathname } from "next/navigation"
import { VillaBookingProvider } from "./VillaBookingProvider"

interface ConditionalVillaBookingProviderProps {
  children: React.ReactNode
}

export function ConditionalVillaBookingProvider({
  children,
}: ConditionalVillaBookingProviderProps) {
  const pathname = usePathname()

  // Check if the current path is a tour route
  const isTourRoute = pathname?.includes("/tours/")

  // Only provide VillaBookingProvider when NOT on tour routes
  if (isTourRoute) {
    return <>{children}</>
  }

  return <VillaBookingProvider>{children}</VillaBookingProvider>
}
