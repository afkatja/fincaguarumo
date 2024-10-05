import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import Icon from "../../../../components/Icon"
import PagesLayout from "../pagesLayout"
import { sanityFetch } from "../../../../sanity/lib/client"
import { PAGE_QUERY } from "../../../../sanity/lib/queries"
import { SanityDocument } from "sanity"
import CardItem from "./CardItem"

const people = [
  {
    name: "Peter",
    avatar: "",
    phoneNumber: "23432543465",
    email: "sdfdsfsdf@sfdsdf.cr",
  },
  {
    name: "Katia",
    avatar: "",
    phoneNumber: "47568667567",
    email: "htyrytr@sfdsdf.cr",
  },
]

export default async function Contact({ locale }: { locale: string }) {
  const content = await sanityFetch<SanityDocument>({
    query: PAGE_QUERY,
    revalidate: 0,
    params: { pageName: "contact", language: locale },
  })
  return (
    <PagesLayout
      locale={locale}
      pageName="about"
      title={content?.title}
      description={content?.description}
      mainImage={content?.mainImage}
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {people.map(person => (
          <CardItem
            key={crypto.randomUUID()}
            name={person.name}
            avatar={person.avatar}
            phoneNumber={person.phoneNumber}
            email={person.email}
          />
        ))}
      </div>
    </PagesLayout>
  )
}
