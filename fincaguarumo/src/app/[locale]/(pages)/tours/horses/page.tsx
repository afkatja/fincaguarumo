"use client"
import Slideshow from "./Slideshow"
import DetailsPageLayout from "../../DetailsPageLayout"

export default function HorseRiding() {
  return (
    <DetailsPageLayout
      title="Horse back riding tour"
      description="Enjoy the surroundings while riding a horse, your tempo, your level"
      slideshow={<Slideshow />}
      price={39}
      location="La Balsa"
      duration="3 hours"
      parent={{ title: "Tours", href: "tours" }}
    />
  )
}
