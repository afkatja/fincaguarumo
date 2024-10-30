import PagesLayout from "../pagesLayout"
import { sanityFetch } from "../../../../sanity/lib/client"
import { PAGE_QUERY } from "../../../../sanity/lib/queries"
import { SanityDocument } from "sanity"
import CardItem from "./CardItem"
import Link from "next/link"
import Icon from "../../../../components/Icon"
import Title from "../../../../components/Title"

const people = [
  {
    name: "Peter",
    avatar:
      "https://scontent-bog2-1.xx.fbcdn.net/v/t39.30808-6/345224841_983295626030915_2167433523251842109_n.jpg?_nc_cat=105&ccb=1-7&_nc_sid=86c6b0&_nc_ohc=jPSu55egeRAQ7kNvgGuqVVy&_nc_zt=23&_nc_ht=scontent-bog2-1.xx&_nc_gid=AuiCqTJppBrHnt8eGIbhZPX&oh=00_AYBK3CPjlD-SeyXpWs6y4kYj_PEMeIwQQULP-kQ5A9sN-w&oe=67278479",
    phoneNumber: "23432543465",
    email: "sdfdsfsdf@sfdsdf.cr",
  },
  {
    name: "Katia",
    avatar:
      "https://scontent-bog2-2.xx.fbcdn.net/v/t39.30808-6/256521242_602739894184377_4556844046395140842_n.jpg?_nc_cat=109&ccb=1-7&_nc_sid=833d8c&_nc_ohc=ne0S_p0b0TEQ7kNvgHh62U0&_nc_zt=23&_nc_ht=scontent-bog2-2.xx&_nc_gid=ACTi1sgqtTezlvRhkrqojja&oh=00_AYATH6RzNha4i79C9adHKklAFofSd13WWhAqFaoYBZNBrA&oe=67278BD9",
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
      <div className="w-11/12 mx-auto grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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

      <div className="w-11/12 mx-auto my-4">
        <div className="my-4">
          <Title
            title="Our location"
            titleClassName="text-3xl font-bold my-5"
          />
          <Icon icon="Waze" className="inline" size={20} />
          <Link
            href="https://ul.waze.com/ul?ll=8.49527176%2C-83.33406687&navigate=no&zoom=17"
            className="my-4 fancy-underline mx-2"
            target="_blank"
          >
            Calle Altos Corozal, La Balsa, Puerto Jimenez, Osa, Costa Rica
          </Link>
          <Icon icon="ExternalLink" className="inline" size={20} />
        </div>

        <iframe
          src="https://www.google.com/maps/embed?pb=!1m14!1m12!1m3!1d10818.29693270256!2d-83.33528678209937!3d8.4966841786644!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!5e0!3m2!1sen!2scr!4v1730252681067!5m2!1sen!2scr"
          width="800"
          height="500"
          className="border-0 w-full maxw-[100%] mx-auto"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        ></iframe>
      </div>
    </PagesLayout>
  )
}
