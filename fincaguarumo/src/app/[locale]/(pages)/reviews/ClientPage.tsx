import { ReviewsProvider } from "@/app/providers/ReviewsProvider"
import GuestLikesSummary from "@/components/GuestLikesSummary"
import { LocationReviews } from "@/components/LocationReviews"

const ClientPage = () => {
  return (
    <ReviewsProvider locationId={process.env.NEXT_PUBLIC_GBP_LOCATION_ID} pageSize={8}>
      <GuestLikesSummary />

      <LocationReviews initialCount={8} showMoreLink={true} mode="infinite" />
    </ReviewsProvider>
  )
}

export default ClientPage