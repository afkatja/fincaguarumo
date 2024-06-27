import Carousel from "@/components/Carousel"

import { getTranslations, unstable_setRequestLocale } from "next-intl/server"

export default async function Component({
  params: { locale },
}: {
  params: { locale: string }
}) {
  unstable_setRequestLocale(locale)

  const t = await getTranslations("hero")
  return (
    <>
      <section className="w-full">
        <Carousel />
      </section>
      <section className="py-12 md:py-24 lg:py-32">
        <div className="container grid gap-8 px-4 md:px-6">
          <div className="grid gap-4 text-center md:text-left">
            <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
              {t("title")}
            </h2>
            <p className="max-w-[700px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
              {t("description")}
            </p>
          </div>
        </div>
      </section>
    </>
  )
}
