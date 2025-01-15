import { sanityFetch } from "../sanity/lib/client"
import { NAV_QUERY } from "../sanity/lib/queries"

type navItem = {
  title: string
  slug: { current: string }
  language: string
  isPublished: boolean
}

const navigation = async ({ locale }: { locale: string }) => {
  const mainNav = await sanityFetch<navItem[]>({
    query: NAV_QUERY,
    revalidate: 0,
    params: { language: locale, category: "mainNav" },
  })

  const main = mainNav
    .map(item => ({ href: `/${locale}/${item?.slug.current}`, ...item }))
    .filter(item => item.isPublished)
    .sort((a, b) => {
      if (a.title < b.title) return -1
      if (a.title > b.title) return 1
      return 0
    })

  const utilsNav = await sanityFetch<navItem[]>({
    query: NAV_QUERY,
    revalidate: 0,
    params: { language: locale, category: "utilsNav" },
  })

  const utils = utilsNav
    .filter(item => item.isPublished)
    .map(item => ({ href: `/${locale}/${item?.slug.current}`, ...item }))

  const navItems = [...main, ...utils]

  return { navItems, main, utils }
}
export default navigation
