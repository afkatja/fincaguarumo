import { getTranslations, unstable_setRequestLocale } from "next-intl/server"

export default async function PageLayout({
  locale,
  pageName,
  children,
  ...props
}: {
  locale: string
  pageName: string
  children: React.ReactNode
  [props: string]: any
}) {
  unstable_setRequestLocale(locale)
  console.log({ locale, pageName })

  if (!pageName) return "loading"
  const t = await getTranslations(pageName)

  return (
    <section className="w-11/12 mx-auto py-12">
      <div className="container grid gap-8">
        <div className="grid gap-4 text-center md:text-left">
          <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
            {t("title")}
          </h2>
          <p className="max-w-[700px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
            {t("description")}
          </p>
        </div>
      </div>
      {children}
    </section>
  )
}
