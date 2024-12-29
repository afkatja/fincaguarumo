import PagesLayout from "../pagesLayout"
import { SanityDocument } from "sanity"
import CardItem from "./CardItem"
import Link from "next/link"
import Icon from "../../../../components/Icon"
import Title from "../../../../components/Title"

export default function Contact({
  locale,
  content,
  people,
}: {
  locale: string
  content: SanityDocument
  people: Record<string, any>
}) {
  return (
    <PagesLayout
      locale={locale}
      pageName="about"
      title={content?.title}
      description={content?.description}
      mainImage={content?.mainImage}
    >
      <div className="w-11/12 mx-auto grid gap-4 md:grid-flow-col auto-cols-min justify-center">
        {people.map((person: Record<string, any>) => (
          <CardItem
            key={crypto.randomUUID()}
            name={person.name}
            avatar={person.avatar}
            phoneNumber={btoa(person.phoneNumber)}
            email={btoa(person.email)}
          />
        ))}
      </div>

      <div className="w-11/12 mx-auto my-4">
        <div className="my-4">
          <Title
            title="Our location"
            titleClassName="text-3xl font-bold my-5"
          />
          <Icon icon="Waze" className="inline dark:fill-zinc-50" size={20} />
          <Link
            href="https://ul.waze.com/ul?ll=8.49527176%2C-83.33406687&navigate=no&zoom=17"
            className="my-4 fancy-underline mx-2"
            target="_blank"
          >
            Calle Altos Corozal, La Balsa, Puerto Jimenez, Osa, Costa Rica
          </Link>
          <Icon
            icon="ExternalLink"
            className="inline dark:stroke-zinc-50"
            size={20}
          />
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
