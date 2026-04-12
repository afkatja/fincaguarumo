import { sanityFetch } from "@/sanity/lib/client"
import { DIALOG_QUERY, TOUR_QUERY } from "@/sanity/lib/queries"
import { IDialog, TTour } from "@/types"
import TourPage from "./TourPage"
import { generateTourMetadata } from "./metadata"

export { generateTourMetadata as generateMetadata }

const Page = async ({
  params,
}: {
  params: Promise<{ slug: string; locale: string }>
}) => {
  const { slug, locale } = await params

  const tour = await sanityFetch<TTour>({
    query: TOUR_QUERY,
    params: { slug, language: locale },
    revalidate: 0,
  })
  const dialog = await sanityFetch<IDialog>({
    query: DIALOG_QUERY,
    revalidate: 0,
  })
  tour.dialog = dialog

  return <TourPage tour={tour} locale={locale} />
}

export default Page
