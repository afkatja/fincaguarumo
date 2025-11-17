export const jsonLd = {
  "@context": "https://schema.org",
  "@type": ["LodgingBusiness", "VacationRental"],
  name: "Villa Bruno - Finca Guarumo",
  alternateName: "Finca Guarumo Villa Bruno",
  description:
    "Off-grid eco-villa in Costa Rica's Osa Peninsula near Corcovado National Park with 100% solar power, wildlife viewing, and sustainable luxury accommodation",
  url: "https://fincaguarumo.com/villa-bruno",
  telephone: "+506-87495341",
  email: "info@fincaguarumo.com",
  priceRange: "$$-$$$",
  currenciesAccepted: "USD",
  paymentAccepted: "Credit Card, Bank Transfer",
  address: {
    "@type": "PostalAddress",
    streetAddress: "6 km from Puerto Jiménez",
    addressLocality: "Puerto Jiménez",
    addressRegion: "Puntarenas",
    postalCode: "60702",
    addressCountry: "CR",
  },
  geo: {
    "@type": "GeoCoordinates",
    latitude: "8.496420632614996",
    longitude: "-83.3341457939961",
  },
  amenityFeature: [
    {
      "@type": "LocationFeatureSpecification",
      name: "100% Solar Power System",
      value: true,
    },
    {
      "@type": "LocationFeatureSpecification",
      name: "Starlink Satellite Internet",
      value: true,
    },
    {
      "@type": "LocationFeatureSpecification",
      name: "Filtered Spring Water System",
      value: true,
    },
    {
      "@type": "LocationFeatureSpecification",
      name: "Wildlife Viewing Platform",
      value: true,
    },
    {
      "@type": "LocationFeatureSpecification",
      name: "Kitchen Facilities",
      value: true,
    },
    {
      "@type": "LocationFeatureSpecification",
      name: "Air Conditioning",
      value: true,
    },
    {
      "@type": "LocationFeatureSpecification",
      name: "Private Bathroom",
      value: true,
    },
    {
      "@type": "LocationFeatureSpecification",
      name: "Outdoor Terrace",
      value: true,
    },
    {
      "@type": "LocationFeatureSpecification",
      name: "Free Parking",
      value: true,
    },
  ],
  petsAllowed: false,
  smokingAllowed: false,
  checkinTime: "15:00",
  checkoutTime: "11:00",
  numberOfRooms: 2,
  floorSize: {
    "@type": "QuantitativeValue",
    value: "54",
    unitCode: "MTK",
  },
  occupancy: {
    "@type": "QuantitativeValue",
    maxValue: 4,
  },
  starRating: {
    "@type": "Rating",
    ratingValue: "5",
  },
  aggregateRating: {
    "@type": "AggregateRating",
    ratingValue: "4.9",
    reviewCount: "9",
    bestRating: "5",
    worstRating: "0",
  },
  image: [
    "https://fincaguarumo.com/images/villa-bruno-exterior.jpg",
    "https://fincaguarumo.com/images/villa-bruno-interior.webp",
    "[Add 5-10 more high-quality images]",
  ],
  photo: [
    {
      "@type": "ImageObject",
      url: "https://fincaguarumo.com/images/villa-bruno-exterior.jpg",
      caption: "Villa Bruno exterior with jungle views",
    },
  ],
  hasMap: "https://maps.app.goo.gl/GAfQHZfeW8ZtKPkk8",
  makesOffer: [
    {
      "@type": "Offer",
      itemOffered: {
        "@type": "Product",
        name: "Villa Bruno Eco-Lodge Stay",
        description: "Sustainable accommodation with wildlife viewing",
      },
      priceSpecification: {
        "@type": "PriceSpecification",
        minPrice: "[Minimum nightly rate]",
        maxPrice: "[Maximum nightly rate]",
        priceCurrency: "USD",
      },
      availability: "https://schema.org/InStock",
    },
  ],
  tourBookingPage: "https://fincaguarumo.com/experiences",
  knowsAbout: [
    "Eco-tourism",
    "Wildlife viewing",
    "Sustainable travel",
    "Corcovado National Park",
    "Birdwatching",
    "Rainforest conservation",
  ],
  areaServed: {
    "@type": "GeoCircle",
    geoMidpoint: {
      "@type": "GeoCoordinates",
      latitude: "8.496420632614996",
      longitude: "-83.3341457939961",
    },
    geoRadius: "50",
  },
  sameAs: [
    "https://www.instagram.com/fincaguarumo.osa",
    "https://www.facebook.com/fincaguarumoosa",
  ],
}

export const orgSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Finca Guarumo",
  alternateName: "Finca Guarumo Osa",
  url: "https://fincaguarumo.com",
  logo: "https://fincaguarumo.com/logo.png",
  description:
    "Sustainable eco-lodge in Costa Rica's Osa Peninsula offering off-grid luxury accommodation near Corcovado National Park",
  foundingDate: "[Your founding year]",
  address: {
    "@type": "PostalAddress",
    streetAddress: "6 km from Puerto Jiménez",
    addressLocality: "Puerto Jiménez",
    addressRegion: "Puntarenas",
    postalCode: "60702",
    addressCountry: "CR",
  },
  geo: {
    "@type": "GeoCoordinates",
    latitude: "8.496420632614996",
    longitude: "-83.3341457939961",
  },
  contactPoint: {
    "@type": "ContactPoint",
    telephone: "+506-87495341",
    contactType: "reservations",
    email: "info@fincaguarumo.com",
    availableLanguage: ["English", "Spanish"],
  },
  sameAs: [
    "https://www.instagram.com/fincaguarumo.osa",
    "https://www.facebook.com/fincaguarumoosa",
    "[Google Business Profile URL]",
    "[TripAdvisor URL if you have one]",
  ],
}
