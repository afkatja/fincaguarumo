// import Carousel from "@/components/Carousel"
import { getTranslations, unstable_setRequestLocale } from "next-intl/server"
import Parallax from "../../components/Parallax"

export default async function Component({
  params: { locale },
}: {
  params: { locale: string }
}) {
  unstable_setRequestLocale(locale)

  const t = await getTranslations("hero")
  return (
    <>
      <Parallax
        className="w-full"
        parallaxImage={[
          {
            offset: 0,
            speed: 1,
            src: "/images/hero-bg.jpg",
            className: "parallax-bg",
          },
          { offset: 0.02, speed: 0.8, src: "/images/cariblanca.png" },
          { offset: 0, speed: 0.9, src: "/images/bruno.png" },
          { offset: 0, speed: 0.7, src: "/images/lapas.png" },
          {
            offset: 0,
            speed: 0.8,
            src: "/images/olly.png",
            style: { marginTop: "-2%" },
          },
          { offset: 0.05, speed: 0.5, src: "/images/toucan.png" },
          { offset: 0, speed: 0.9, src: "/images/titi.png" },
          {
            offset: 0,
            speed: 1,
            src: "/images/hero-footer.png",
            className: "parallax-footer",
          },
        ]}
      >
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
      </Parallax>
    </>
  )
}
