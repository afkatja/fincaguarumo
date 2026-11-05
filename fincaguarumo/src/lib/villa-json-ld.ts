export const containsPlace = [
  {
    "@type": "House",
    name: "Villa Bruno Main Unit",
    identifier: "villa-bruno-unit-1",
    occupancy: {
      "@type": "QuantitativeValue",
      maxValue: 4,
      value: 4,
    },
    floorSize: {
      "@type": "QuantitativeValue",
      value: 54,
      unitCode: "MTK",
    },
    numberOfRooms: 2,
    numberOfBedrooms: 2,
    numberOfBathroomsTotal: 1,
    bed: [
      {
        "@type": "BedDetails",
        typeOfBed: "Queen bed",
        numberOfBeds: 2,
      },
    ],
    amenityFeature: [
      {
        "@type": "LocationFeatureSpecification",
        name: "Kitchen",
        value: true,
      },
      {
        "@type": "LocationFeatureSpecification",
        name: "WiFi",
        value: true,
      },
      {
        "@type": "LocationFeatureSpecification",
        name: "LGBTQ+ inclusive / zero-discrimination policy",
      },
    ],
  },
]

export const orgSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Finca Guarumo",
  alternateName: [
    "Finca Guarumo Osa",
    "Finca Guarumo Osa Peninsula",
    "Finca Guarumo Costa Rica",
  ],
  url: "https://fincaguarumo.com",
  logo: "https://fincaguarumo.com/logo.png",
  description:
    "Sustainable eco-lodge in Costa Rica's Osa Peninsula offering off-grid luxury accommodation near Corcovado National Park",
  foundingDate: "2025",
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
    availableLanguage: ["English", "Spanish", "Dutch", "Russian", "German"],
  },
  sameAs: [
    "https://www.instagram.com/fincaguarumo.osa",
    "https://www.facebook.com/fincaguarumoosa",
    "https://maps.app.goo.gl/rqjLyadSSE4F9AMk7",
  ],
}
