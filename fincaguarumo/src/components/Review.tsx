"use client"
import Image from "next/image"
import { useParams } from "next/navigation"
import React from "react"

const Review = ({ review }: { review: google.maps.places.Review }) => {
  const { locale } = useParams()
  const stars = Array.from({ length: review?.rating || 0 }, (_, i) => i + 1)
  return (
    <div
      className="bg-zinc-50 rounded-lg shadow-sm p-4 my-4 md:my-0"
      data-id="cfcd208495d565ef66e7dff9f98764da"
    >
      <div className="flex items-center gap-2">
        <Image
          src={
            review?.authorAttribution?.photoURI ||
            "https://cdn.trustindex.io/assets/platform/Google/user.svg"
          }
          alt={review?.authorAttribution?.displayName || "Reviewer"}
          width="40"
          height="40"
          loading="lazy"
        />
        <div>
          <p className="text-guarumo-primary font-bold text-lg truncate max-w-24">
            {review?.authorAttribution?.displayName}
          </p>
          <p className="text-zinc-400 text-sm">
            {review?.publishTime?.toLocaleDateString(locale, {
              year: "numeric",
              month: "long",
              day: "numeric",
            }) || ""}
          </p>
        </div>
        <Image
          src="https://cdn.trustindex.io/assets/platform/Google/icon.svg"
          alt="Google"
          width="20"
          height="24"
          className="ml-auto self-start"
        />
      </div>
      <div
        className="flex items-center my-4"
        aria-label={`Rating: ${review?.rating} out of 5`}
      >
        {stars.map((n, i) => (
          <Image
            key={n}
            className="ti-star"
            src="https://cdn.trustindex.io/assets/platform/Google/star/f.svg"
            alt="Booking"
            width="17"
            height="17"
            loading="lazy"
          />
        ))}
      </div>
      <div className="text-zinc-800">{review?.text}</div>
    </div>
  )
}

export default Review
