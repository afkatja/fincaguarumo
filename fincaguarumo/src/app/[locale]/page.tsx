import { sanityFetch } from "../../sanity/lib/client"
import { HOME_QUERY } from "../../sanity/lib/queries"
import { PortableText } from "next-sanity"
import Carousel from "@/components/Carousel"

export default async function Home({
  params: { locale },
}: {
  params: { locale: string }
}) {
  const content: {
    hero_title: string
    hero_slogan: string
    subtitle?: string
  } = await sanityFetch({
    query: HOME_QUERY,
    params: { language: locale },
    revalidate: 0,
  })

  return (
    <>
      <div className="parallax-bg relative">
        <video src="/assets/sunrise.m4v" autoPlay loop muted />
        <div className="hero text-center text-white drop-shadow-sharp">
          <h1 className="text-6xl leading-normal font-black">
            {content?.hero_title}
          </h1>
          <h2 className="text-3xl mb-5 font-semibold">
            {content?.hero_slogan}
          </h2>
          <h3 className="text-xl leading-normal">{content?.subtitle}</h3>
        </div>
      </div>
      <Carousel />
    </>
  )
}
