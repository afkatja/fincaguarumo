import { POST_QUERY_RESULT } from "../../../../../sanity.types"
import { GalleryImage } from "../../../../lib/sanityImages"
import Breadcrumbs from "../../../../components/Breadcrumbs"
// import Title from "../../../../components/Title"
import RichText from "../../../../components/RichText"
import PagesLayout from "../../(pages)/pagesLayout"

export function Post({
  post,
  parent,
  locale,
}: {
  post: POST_QUERY_RESULT
  parent: { title: string; href: string }
  locale: string
}) {
  const { title, mainImage, body, slug } = post || {}

  return (
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

      {body ? <RichText body={body} /> : null}
    </PagesLayout>
  )
}
