import { createNavigation } from "next-intl/navigation"
import Icon from "./Icon"
import { featureFlags } from "../config"
import Image from "next/image"

const Logo = () => {
  const { Link } = createNavigation()

  if (featureFlags.USE_TRAVEL_PROUD_LOGO) {
    return (
      <Link href="/" className="block py-3 h-full" prefetch>
        <Image
          src="/images/travel-proud-logo.png"
          alt="Travel Proud Logo"
          className="h-full max-h-[100px] w-auto"
          width={100}
          height={100}
        />
      </Link>
    )
  }

  return (
    <Link href="/" className="block py-3 h-full logo-link" prefetch>
      <Icon
        icon="Logo"
        className="logo fill-guarumo-primary dark:fill-zinc-50"
        size={100}
      />
    </Link>
  )
}

export default Logo
