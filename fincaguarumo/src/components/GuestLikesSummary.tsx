"use client"
import { usePlace } from "../app/providers/PlaceProvider"
import Title from "./Title"
import { ReviewSummary } from "./ReviewSummary"
import { useTranslations } from "next-intl"

export const GuestLikesSummary = () => {
  const { place } = usePlace()
  const r = useTranslations("reviews")

  if (!place) return null

  return (
    <div className="prose w-11/12 lg:prose-lg mx-auto py-5 mt-5">
      <div className="bg-gradient-dark rounded-lg shadow-sm p-6">
        <Title
          title={r("whatGuestsLoveMost")}
          Heading="h2"
          titleClassName="text-3xl font-bold text-guarumo-primary dark:text-zinc-50 mt-5 mb-4"
          icon={{ iconClassName: "fill-guarumo-primary dark:fill-zinc-50" }}
        />
        <ReviewSummary
          showRating={false}
          showDistribution={false}
          showRecentComments={false}
          showReadMore={false}
          useAIProcessing={true}
        />
      </div>
    </div>
  )
}

export default GuestLikesSummary
