import { sanityFetch } from "../../../../../sanity/lib/client"
import { TOUR_QUERY } from "../../../../../sanity/lib/queries"
import TourPage from "./TourPage"
import { TTour } from "../data"

const Page = async ({ params: { slug } }: { params: { slug: string } }) => {
  const tour = await sanityFetch<TTour>({
    query: TOUR_QUERY,
    params: { slug },
  })

  return <TourPage tour={tour} />
}

export default Page
