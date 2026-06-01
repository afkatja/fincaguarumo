"use client"
import { POST_QUERY_RESULT } from "../../../../../sanity.types"
import { GalleryImage } from "../../../../lib/sanityImages"
import Breadcrumbs from "../../../../components/Breadcrumbs"
import Title from "../../../../components/Title"
import RichText from "../../../../components/RichText"
import PagesLayout from "../../(pages)/pagesLayout"
import BlogMetadata from "../../../../components/BlogMetadata"
import { useTranslations } from "next-intl"
import Link from "next/link"
import Icon from "../../../../components/Icon"
import FAQ from "../../../../components/FAQ"

/**
 * Render a post page using PagesLayout, optionally including breadcrumbs and the post body.
 *
 * @param post - Post data containing `title`, `mainImage`, `body`, and `slug` used to populate the page
 * @param parent - Parent navigation item with `title` and `href`; if falsy, breadcrumbs are not rendered
 * @param locale - Locale identifier for the page
 * @returns The React element representing the composed post page
 */
export function Post({
  post,
  parent,
  locale,
}: {
  post: POST_QUERY_RESULT
  parent: { title: string; href: string }
  locale: string
}) {
  const { title, tldr, mainImage, body, slug, faq } = post || {}
  const tPage = useTranslations("page")
  return (
    <>
      <BlogMetadata post={post} />
      <PagesLayout
        locale={locale}
        pageName={slug?.current as string}
        title={title}
        mainImage={mainImage as GalleryImage | null}
      >
        {parent && (
          <Breadcrumbs
            className="max-w-240 prose w-11/12 lg:prose-lg mx-auto mt-4"
            title={title as string}
            parent={parent}
          />
        )}
        {tldr ? (
          <RichText
            body={tldr}
            className="tldr text-sm italic border-b border-zinc-300 p-4"
          />
        ) : null}
        {body ? <RichText body={body} /> : null}
        {faq && faq?.length > 0 ? (
          <div
            id="faq"
            className="w-11/12 mx-auto mt-3 mb-8 flex flex-col py-5 lg:px-40"
          >
            <Title
              title={tPage("FAQ") || "FAQ"}
              Heading="h2"
              titleClassName="text-xl font-bold text-guarumo-primary dark:text-zinc-50"
              icon={{ title: "Guarumo" }}
            />
            <div className="md:grid md:col-span-2 items-center gap-2 mt-4">
              <FAQ faqs={faq} />
            </div>
            <div className="w-full flex justify-end">
              <Link
                href={`/faq`}
                className="w-80 inline-flex items-center justify-end h-full group no-underline mt-8 mr-4"
              >
                {tPage("moreFAQ") || "More FAQ"}
                <Icon
                  icon="ArrowRight"
                  className="h-8 w-8 transition-all group-hover:translate-x-3 stroke-guarumo-accent dark:stroke-zinc-50"
                  color="currentColor"
                />
              </Link>
            </div>
          </div>
        ) : null}
      </PagesLayout>
    </>
  )
}
