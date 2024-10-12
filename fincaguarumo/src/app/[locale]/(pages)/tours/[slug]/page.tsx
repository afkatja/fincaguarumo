import { sanityFetch } from "../../../../../sanity/lib/client"
import { TOUR_QUERY } from "../../../../../sanity/lib/queries"
import TourPage from "./TourPage"
import { TTour } from "../data"

const Page = async ({
  params: { slug, locale },
}: {
  params: { slug: string; locale: string }
}) => {
  const tour = await sanityFetch<TTour>({
    query: TOUR_QUERY,
    params: { slug, language: locale },
    revalidate: 0,
  })

  return <TourPage tour={tour} />
}

export default Page
