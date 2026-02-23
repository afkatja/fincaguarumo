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
    ],
  },
]

export const jsonLd = {
  "@context": "https://schema.org",
  "@type": "LodgingBusiness",
  additionalType: "VacationRental",
  name: "Villa Bruno - Finca Guarumo",
  identifier: "villa-bruno-finca-guarumo",
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
    latitude: 8.496420632614996,
    longitude: -83.3341457939961,
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
  checkinTime: "2026-03-01T15:00:00+00:00",
  checkoutTime: "2026-03-01T11:00:00+00:00",
  numberOfRooms: 2,
  floorSize: {
    "@type": "QuantitativeValue",
    value: 54,
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
    ratingValue: 5,
    reviewCount: 11,
    bestRating: 5,
    worstRating: 1,
  },
  review: [
    {
      "@type": "Review",
      author: {
        "@type": "Person",
        name: "Eric (Williston, Vermont)",
      },
      datePublished: "2025-11-18",
      reviewRating: {
        "@type": "Rating",
        ratingValue: 5,
        bestRating: 5,
      },
      reviewBody:
        "We really enjoyed our stay at Finca Guarumo. The grounds were incredibly lush and diverse with plants wildlife and the friendly owners have done a lot to make it beautiful and productive. Villa Bruno is a modern oasis in the jungle complete with every modern convenience you could ask for. It's clean and new with a great view. We hope to return again soon.",
    },
    {
      "@type": "Review",
      author: {
        "@type": "Person",
        name: "Ellie (9 years on Airbnb)",
      },
      datePublished: "2025-11-21",
      reviewRating: {
        "@type": "Rating",
        ratingValue: 5,
        bestRating: 5,
      },
      reviewBody:
        "Katja and Peter’s home is just what we wanted, something off grid where we could switch off and enjoy the beautiful surroundings. We were very lucky to see squirrel monkeys, mealy parrots and of course the famous Bruno! The views are beautiful and we spent every evening on the verandah, joined by their lovely cats one evening too. The shower was hot and powerful and the beds were very comfy. The hosts were very hospitable, offering fresh coconuts and bananas from their garden and advice for activities and nearby walks. 10/10 hosts thank you!",
    },
    {
      "@type": "Review",
      author: {
        "@type": "Person",
        name: "Magda (10 years on Airbnb)",
      },
      datePublished: "2025-08-15",
      reviewRating: {
        "@type": "Rating",
        ratingValue: 5,
        bestRating: 5,
      },
      reviewBody:
        "Looking for a jungle retreat with all the comforts of home? Look no further than Katja's place! This hidden gem offers hot showers, reliable internet, and cozy beds with two pairs of pillows (hard and soft) to cater to everyone's needs. The property is meticulously clean, and the views of nature from the patio are simply breathtaking. During our stay, we spotted 2 types of monkeys, parrots, macaws, toucans, and a stunning blue morpho butterfly, among many other species. Highly recommend for nature lovers and those seeking a tranquil jungle escape! Katja and Peter are very attentive so if you need anything they will surely help! Thank you for having us!",
    },
  ],
  image: [
    "https://fincaguarumo.com/images/villa-bruno-exterior.jpg",
    "https://fincaguarumo.com/images/villa-bruno-interior.webp",
    "https://fincaguarumo.com/images/villa-bruno-terrace.jpg",
    "https://fincaguarumo.com/images/villa-bruno-bedroom.jpg",
    "https://fincaguarumo.com/images/villa-bruno-kitchen.jpg",
    "https://fincaguarumo.com/images/villa-bruno-bathroom.jpg",
    "https://fincaguarumo.com/images/villa-bruno-wildlife.jpg",
    "https://fincaguarumo.com/images/villa-bruno-sunset.jpg",
  ],
  photo: [
    {
      "@type": "ImageObject",
      url: "https://fincaguarumo.com/images/villa-bruno-exterior.jpg",
      caption: "Villa Bruno exterior with jungle views",
    },
  ],
  hasMap: "https://maps.app.goo.gl/GAfQHZfeW8ZtKPkk8",
  containsPlace,
  makesOffer: [
    {
      "@type": "Offer",
      itemtype: "https://schema.org/Offer",
      identifier: "villa-bruno-standard-rate",
      name: "Villa Bruno Standard Rate",
      description: "Sustainable accommodation with wildlife viewing",
      checkinTime: "2024-11-01T15:00:00+00:00",
      checkoutTime: "2024-11-01T11:00:00+00:00",
      price: 89.0,
      priceCurrency: "USD",

      itemOffered: {
        "@type": "HotelRoom",
        name: "Villa Bruno Main Unit",
        occupancy: {
          "@type": "QuantitativeValue",
          value: 4,
          maxValue: 4,
        },
      },

      priceSpecification: {
        "@type": "CompoundPriceSpecification",
        price: 89.0,
        priceCurrency: "USD",
      },
      availability: "https://schema.org/InStock",
      validFrom: "2024-01-01",
      url: "https://fincaguarumo.com/stay",
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
      latitude: 8.496420632614996,
      longitude: -83.3341457939961,
    },
    geoRadius: 50,
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
  owns: {
    "@type": "LodgingBusiness",
    "@id": "https://fincaguarumo.com/stay",
    name: "Villa Bruno at Finca Guarumo",
    image: "https://fincaguarumo.com/images/villa-bruno-exterior.jpg",
    telephone: "+506-87495341",
    priceRange: "$$-$$$",
    address: {
      "@type": "PostalAddress",
      streetAddress: "6 km from Puerto Jiménez",
      addressLocality: "Puerto Jiménez",
      addressRegion: "Puntarenas",
      postalCode: "60702",
      addressCountry: "CR",
    },
  },
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
