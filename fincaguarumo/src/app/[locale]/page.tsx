import Carousel from "@/components/Carousel"
// import { getTranslations, unstable_setRequestLocale } from "next-intl/server"

export default async function Component({
  params: { locale },
}: {
  params: { locale: string }
}) {
  // unstable_setRequestLocale(locale)

  // const t = await getTranslations("hero")
  return (
    <>
      <div className="parallax-bg sunburst">Animate</div>
      <Carousel />
    </>
  )
}
