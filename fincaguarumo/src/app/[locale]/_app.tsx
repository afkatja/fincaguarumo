/**
 * v0 by Vercel.
 * @see https://v0.dev/t/wKg8k6WVz17
 * Documentation: https://v0.dev/docs#integrating-generated-code-into-your-nextjs-app
 */

import type { AppProps } from "next/app"

import Layout from "./layout"

export default function App({ Component, pageProps }: AppProps) {
  console.log({ pageProps })
  return (
    <Layout>
      <Component {...pageProps} />
    </Layout>
  )
}
