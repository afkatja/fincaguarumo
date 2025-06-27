import { SanityDocument } from "sanity"
import { sanityFetch } from "../../../../sanity/lib/client"
import { PAGE_QUERY } from "../../../../sanity/lib/queries"

import ContactPage from "./ContactPage"

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
  const content = await sanityFetch<SanityDocument>({
    query: PAGE_QUERY,
    revalidate: 0,
    params: { pageName: "contact", language: locale },
  })
  return <ContactPage locale={locale} content={content} people={people} />
}

export default Contact
