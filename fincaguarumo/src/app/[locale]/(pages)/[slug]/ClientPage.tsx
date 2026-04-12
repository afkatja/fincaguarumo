"use client"
import { createNavigation } from "next-intl/navigation"
import { useTranslations } from "next-intl"
import RichText from "@/components/RichText"
import { Content } from "./page"
import FAQ from "@/components/FAQ"
import Title from "@/components/Title"
import Icon from "../../../../components/Icon"

const ClientPage = ({ content }: { content: Content }) => {
  const { Link } = createNavigation()
  const tPage = useTranslations("page")

  return (
    <>
      <RichText body={content?.body} />

      {/* FAQ Section - Only show if enabled */}
      {content?.showFAQ && (
        <div className="w-11/12 mx-auto mt-3 mb-8 flex flex-col">
          <Title
            title={tPage("FAQ")}
            Heading="h2"
            titleClassName="text-3xl font-bold text-guarumo-primary dark:text-zinc-50"
            icon={{ title: "Guarumo" }}
          />
          <div className="md:grid md:col-span-2 items-center gap-2 mt-4">
            {content?.faq && content?.faq.length > 0 && (
              <FAQ faqs={content.faq} />
            )}
            <Link
              href={`/faq`}
              className="w-80 inline-flex items-center justify-center h-full group no-underline mt-8"
            >
              {tPage("moreFAQ")}
              <Icon
                icon="ArrowRight"
                className="h-8 w-8 transition-all group-hover:translate-x-3 stroke-guarumo-accent dark:stroke-zinc-50"
                color="currentColor"
              />
            </Link>
          </div>
        </div>
      )}
    </>
  )
}

export default ClientPage
