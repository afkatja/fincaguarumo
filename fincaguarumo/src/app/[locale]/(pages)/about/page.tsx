import React from "react"
import Layout from "../PageLayout"
import { getTranslations, unstable_setRequestLocale } from "next-intl/server"

const About = async ({
  params: { locale },
}: {
  params: { locale: string }
}) => {
  unstable_setRequestLocale(locale)
  const t = await getTranslations("about")

  return (
    <Layout locale={locale} pageName="about">
      <div className="prose prose-lg mx-auto">
        {t.rich("body", {
          p: chunks => <p key={crypto.randomUUID()}>{chunks}</p>,
        })}
      </div>
    </Layout>
  )
}

export default About
