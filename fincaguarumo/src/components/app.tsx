/**
 * v0 by Vercel.
 * @see https://v0.dev/t/wKg8k6WVz17
 * Documentation: https://v0.dev/docs#integrating-generated-code-into-your-nextjs-app
 */

"use client"
import type { AppProps } from "next/app"
import Layout from "../app/[locale]/layout"

interface Props extends AppProps {
  locale: string
}
export default function App({ Component, locale }: Props) {
  console.log("COMPONENTS APP")
  return (
    <Layout>
      <Component locale={locale} />
    </Layout>
  )
}
