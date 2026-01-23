"use client"
import Image from "next/image"
import { useParams } from "next/navigation"
import Script from "next/script"
import React from "react"
import { TReview } from "../types"

const platformIcons = {
  google: "https://cdn.trustindex.io/assets/platform/Google/icon.svg",
  airbnb:
    "https://cdn.freebiesupply.com/logos/large/2x/airbnb-2-logo-png-transparent.png",
  booking:
    "https://upload.wikimedia.org/wikipedia/commons/6/6b/Booking.com_Icon_2022.svg",
}

const starIcons = {
  filled: "https://cdn.trustindex.io/assets/platform/Google/star/f.svg",
  empty: "https://cdn.trustindex.io/assets/platform/Google/star/e.svg",
}

// Default user icons
const defaultUserIcon = {
  google: "https://cdn.trustindex.io/assets/platform/Google/user.svg",
  airbnb: "https://a0.muscache.com/defaults/user_pic-225x225.png",
  booking: "https://a0.muscache.com/defaults/user_pic-225x225.png",
}

const Review = ({ review }: { review: TReview }) => {
  const { locale } = useParams()
  const platform = review.platform || "google"

  // Centralized derived values
  const normalizedRating =
    platform === "booking" && review?.rating
      ? Math.ceil(review?.rating / 2)
      : review?.rating || 0

  const publishDate = (() => {
    const dateValue = review?.publishTime || review?.date
    if (!dateValue) return ""
    try {
      const date = dateValue instanceof Date ? dateValue : new Date(dateValue)
      if (isNaN(date.getTime())) return ""
      return date.toISOString()
    } catch {
      return ""
    }
  })()

  const authorName =
    review?.authorAttribution?.displayName || review?.author?.name || "Guest"

  const schemaScriptId = `json-ld-review-${platform}-${authorName.replace(/\s+/g, "-").toLowerCase()}-${normalizedRating}-${publishDate || "no-date"}`

  const stars = Array.from({ length: normalizedRating }, (_, i) => i + 1)

  const schema = {
    "@context": "https://schema.org",
    "@type": "Review",
    itemReviewed: {
      "@type": "LodgingBusiness",
      name: "Finca Guarumo",
      image: "https://fincaguarumo.com/logo-single.png",
    },
    author: {
      "@type": "Person",
      name: authorName,
    },
    reviewRating: {
      "@type": "Rating",
      ratingValue: normalizedRating.toString(),
      bestRating: "5",
      worstRating: "1",
    },
    ...(publishDate && { datePublished: publishDate }),
    reviewBody: review?.text || review?.reviewText || "",
    publisher: {
      "@type": "Organization",
      name:
        platform === "google"
          ? "Google Business Profile"
          : platform === "airbnb"
            ? "Airbnb"
            : "Booking.com",
    },
  }

  return (
    <div
      className="bg-zinc-50 rounded-lg shadow-sm p-4 my-4 md:my-0"
      data-id="cfcd208495d565ef66e7dff9f98764da"
      itemScope
      itemType="https://schema.org/Review"
    >
      <div className="flex items-center gap-2">
        <div className="rounded-full">
          <Image
            src={
              review?.authorAttribution?.photoURI ||
              review?.photoUrl ||
              defaultUserIcon[platform]
            }
            alt={review?.authorAttribution?.displayName || "Reviewer"}
            width="40"
            height="40"
            loading="lazy"
          />
        </div>
        <div>
          <p className="text-guarumo-primary font-bold text-lg truncate max-w-24">
            {authorName}
          </p>
          {publishDate && (
            <p className="text-zinc-400 text-sm">
              {new Date(publishDate).toLocaleDateString(locale, {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          )}
        </div>
        <Image
          src={platformIcons[platform]}
          alt={`${platform} review`}
          width={platform === "airbnb" ? 34 : 20}
          height={24}
          className="shrink-0 mt-1 ml-auto"
          title={`Review from ${platform.charAt(0).toUpperCase() + platform.slice(1)}`}
        />
      </div>
      <div
        className="flex items-center my-4"
        aria-label={`Rating: ${normalizedRating} out of 5`}
        itemProp="reviewRating"
        itemScope
        itemType="https://schema.org/Rating"
      >
        <meta itemProp="ratingValue" content={normalizedRating.toString()} />
        <meta itemProp="bestRating" content="5" />
        <meta itemProp="worstRating" content="1" />
        {stars.map((n, i) => (
          <Image
            key={n}
            className="ti-star"
            src={
              normalizedRating && n <= normalizedRating
                ? starIcons.filled
                : starIcons.empty
            }
            alt={
              normalizedRating && n <= normalizedRating
                ? "Filled star"
                : "Empty star"
            }
            width="17"
            height="17"
            loading="lazy"
          />
        ))}
      </div>
      <div className="text-zinc-800">{review?.text || review?.reviewText}</div>
      <Script
        id={schemaScriptId}
        strategy="afterInteractive"
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(schema).replace(/</g, "\\u003c"),
        }}
      />
    </div>
  )
}

export default Review
