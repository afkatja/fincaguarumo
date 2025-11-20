import React from "react"
import Layout from "../pagesLayout"
import { loadTranslations } from "@/lib/utils"
import ClientPage from "./ClientPage"

const page = async ({ params }: { params: any }) => {
  const { locale } = await params
  const messages = await loadTranslations(locale)

  return (
    <Layout
      locale={locale}
      pageName="Reviews"
      title={messages.reviews?.title ?? "Reviews"}
    >
      <ClientPage />
    </Layout>
  )
}

export default page
