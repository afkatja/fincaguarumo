export const jsonLd = {
  "@context": "https://schema.org",
  "@type": "LodgingBusiness",
  name: "Villa Bruno - Finca Guarumo",
  description:
    "Off-grid eco-villa in Costa Rica's Osa Peninsula near Corcovado National Park",
  url: "https://fincaguarumo.com/villa-bruno",
  telephone: "+506-87495341",
  email: "info@fincaguarumo.com",
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
      name: "Solar Power",
      value: true,
    },
    {
      "@type": "LocationFeatureSpecification",
      name: "Starlink Internet",
      value: true,
    },
    {
      "@type": "LocationFeatureSpecification",
      name: "Filtered Water System",
      value: true,
    },
  ],
  petsAllowed: false,
  smokingAllowed: false,
  checkinTime: "15:00",
  checkoutTime: "11:00",
  numberOfRooms: "2",
  starRating: {
    "@type": "Rating",
    ratingValue: "5",
  },
  priceRange: "$$",
  image: [
    "https://fincaguarumo.com/images/villa-bruno-exterior.jpg",
    "https://fincaguarumo.com/images/villa-bruno-interior.webp",
  ],
  hasMap: "https://maps.app.goo.gl/GAfQHZfeW8ZtKPkk8",
  sameAs: [
    "https://www.instagram.com/fincaguarumo.osa",
    "https://www.facebook.com/fincaguarumoosa",
  ],
}
