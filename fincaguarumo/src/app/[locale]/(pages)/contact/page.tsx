import { sanityFetch } from "../../../../sanity/lib/client"
import { PAGE_QUERY } from "../../../../sanity/lib/queries"
import { PAGE_QUERY_RESULT } from "../../../../../sanity.types"

import ContactPage from "./ContactPage"

const schema = {
  "@context": "https://schema.org",
  "@type": "TouristDestination",
  name: "Villa Bruno at Finca Guarumo Eco-Lodge",
  description:
    "Sustainable eco-lodge in the Osa Peninsula offering wildlife viewing and rainforest experiences",
  geo: {
    "@type": "GeoCoordinates",
    latitude: "8.496420632614996",
    longitude: "-83.3341457939961",
  },
  touristType: [
    "Eco-tourists",
    "Nature photographers",
    "Birdwatchers",
    "Wildlife enthusiasts",
    "Sustainable travelers",
  ],
  includesAttraction: [
    {
      "@type": "TouristAttraction",
      name: "Corcovado National Park",
      description: "One of the most biodiverse places on Earth",
    },
    {
      "@type": "TouristAttraction",
      name: "Scarlet Macaw Viewing",
      description: "Daily sightings of endangered scarlet macaws",
    },
  ],
}

const people = [
  {
    name: "Peter",
    avatar: "/images/peter.jpg",
    email: "info@fincaguarumo.com",
    phoneNumber: "+50687729995",
  },
  {
    name: "Katia",
    avatar: "/images/katia.jpeg",
    phoneNumber: "+50687495341",
    email: "info@fincaguarumo.com",
  },
]

const Contact = async ({ params }: { params: any }) => {
  const { locale } = await params
  const content = await sanityFetch<PAGE_QUERY_RESULT>({
    query: PAGE_QUERY,
    revalidate: 0,
    params: { pageName: "contact", language: locale },
  })

  return (
    <>
      <ContactPage locale={locale} content={content} people={people} />
      <script type="application/ld+json">
        {JSON.stringify(schema).replace(/</g, "\\u003c")}
      </script>
    </>
  )
}

export default Contact
