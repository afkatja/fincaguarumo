import type { SanityImageObject } from "@/types"

const baseUrl = "https://fincaguarumo.com"

export const localeMap: Record<string, string> = {
  en: "en_US",
  es: "es_CR",
  de: "de_DE",
  nl: "nl_NL",
  ru: "ru_RU",
}

type ProcessedSanityImage = SanityImageObject & { url?: string }

function getImageUrl(image: SanityImageObject | undefined): string {
  if (!image) return ""
  return (image as ProcessedSanityImage).url || ""
}

export const staticAmenities = [
  { name: "100% Solar Power System", value: true },
  { name: "Starlink Satellite Internet", value: true },
  { name: "Filtered Spring Water System", value: true },
  { name: "Wildlife Viewing Platform", value: true },
  { name: "Kitchen Facilities", value: true },
  { name: "Air Conditioning", value: false },
  { name: "Private Bathroom", value: true },
  { name: "Outdoor Terrace", value: true },
  { name: "Free Parking", value: true },
  { name: "LGBTQ+ inclusive / zero-discrimination policy", value: true },
] as const

export const staticAddress = {
  "@type": "PostalAddress",
  streetAddress: "Calle La Balsa, 6 km from Puerto Jiménez",
  addressLocality: "Puerto Jiménez",
  addressRegion: "Puntarenas",
  postalCode: "60702",
  addressCountry: "CR",
}

export const staticGeo = {
  "@type": "GeoCoordinates",
  latitude: 8.496008133150292,
  longitude: -83.33408512883554,
}

export const staticKnowsAbout = [
  "Eco-tourism",
  "Wildlife viewing",
  "Sustainable travel",
  "Corcovado National Park",
  "Birdwatching",
  "Rainforest conservation",
  "Solar power systems",
  "Spring water systems",
  "Organic farming",
  "Reforestation",
]

export const staticAreaServed = {
  "@type": "GeoCircle",
  geoMidpoint: {
    "@type": "GeoCoordinates",
    latitude: 8.496420632614996,
    longitude: -83.3341457939961,
  },
  geoRadius: 50,
}

export const staticSocial = [
  "https://www.instagram.com/fincaguarumo.osa",
  "https://www.facebook.com/fincaguarumoosa",
  "https://www.youtube.com/@FincaGuarumo",
]

export const gbpUrl = "https://maps.app.goo.gl/SVgH1dBZqY8eUUhm9"
export const airbnbUrl = "https://www.airbnb.com/rooms/1392758794880269478"

export const staticSameAs = [
  ...staticSocial,
  gbpUrl,
  airbnbUrl,
]

export interface LodgingBusinessConfig {
  name: string
  identifier: string
  alternateName?: string[]
  description: string
  url: string
  floorSizeValue: number
  occupancyMax: number
  reviewCount: number
  starRating: string
  price: number
  priceCurrency: string
  checkinTime: string
  checkoutTime: string
  validFrom: string
  images: string[]
  knowsAbout?: string[]
  sameAs?: string[]
  mainImage?: SanityImageObject
  hasMap?: string
}

export function buildLodgingBusinessSchema(config: LodgingBusinessConfig) {
  const {
    name,
    identifier,
    alternateName = ["Villa Bruno", "Villa Bruno at Finca Guarumo"],
    description,
    url,
    floorSizeValue,
    occupancyMax,
    reviewCount,
    starRating,
    price,
    priceCurrency,
    checkinTime,
    checkoutTime,
    validFrom,
    images,
    knowsAbout = staticKnowsAbout,
    sameAs = staticSameAs,
    mainImage,
    hasMap = gbpUrl,
  } = config

  const imageUrls = getImageUrl(mainImage) ? [getImageUrl(mainImage)] : images

  return {
    "@type": "LodgingBusiness",
    additionalType: "VacationRental",
    name,
    identifier,
    alternateName,
    partOf: {
      "@type": "Organization",
      name: "Finca Guarumo",
      url: baseUrl,
    },
    branchOf: {
      "@type": "Organization",
      name: "Finca Guarumo",
    },
    description,
    url,
    telephone: "+506-87495341",
    email: "info@fincaguarumo.com",
    priceRange: "$$-$$$",
    currenciesAccepted: "USD, CRC, EUR",
    paymentAccepted: "Cash, PayPal, Credit Card, Bank Transfer",
    address: staticAddress,
    geo: staticGeo,
    amenityFeature: staticAmenities.map(a => ({
      "@type": "LocationFeatureSpecification",
      name: a.name,
      value: a.value,
    })),
    petsAllowed: false,
    smokingAllowed: false,
    checkinTime,
    checkoutTime,
    numberOfRooms: 1,
    floorSize: {
      "@type": "QuantitativeValue",
      value: floorSizeValue,
      unitCode: "MTK",
    },
    occupancy: {
      "@type": "QuantitativeValue",
      maxValue: occupancyMax,
    },
    starRating: {
      "@type": "Rating",
      ratingValue: starRating,
    },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: 5,
      reviewCount,
      bestRating: 5,
      worstRating: 1,
    },
    image: imageUrls,
    hasMap,
    makesOffer: [
      {
        "@type": "Offer",
        itemtype: "https://schema.org/Offer",
        identifier: "villa-bruno-standard-rate",
        name: "Villa Bruno Standard Rate",
        description: "Sustainable accommodation with wildlife viewing",
        checkinTime,
        checkoutTime,
        price,
        priceCurrency,
        itemOffered: {
          "@type": "HotelRoom",
          name: "Villa Bruno Main Unit",
          occupancy: {
            "@type": "QuantitativeValue",
            value: occupancyMax,
            maxValue: occupancyMax,
          },
        },
        priceSpecification: {
          "@type": "CompoundPriceSpecification",
          price,
          priceCurrency,
        },
        availability: "https://schema.org/InStock",
        validFrom,
        url,
      },
    ],
    tourBookingPage: `${baseUrl}/tours`,
    knowsAbout,
    areaServed: staticAreaServed,
    sameAs,
  }
}

export function buildWebSiteSchema(locale: string) {
  return {
    "@type": "WebSite",
    name: "Finca Guarumo",
    url: baseUrl,
    description:
      "Sustainable eco-lodge in Costa Rica's Osa Peninsula offering off-grid luxury accommodation near Corcovado National Park",
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${baseUrl}/search?q={search_term_string}`,
      },
      queryInput: "required name=search_term_string",
    },
    publisher: {
      "@type": "Organization",
      name: "Finca Guarumo",
      url: baseUrl,
    },
    inLanguage: localeMap[locale] || "en_US",
  }
}
