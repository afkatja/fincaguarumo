import type { AppProps } from "next/app"

import Layout from "./layout"

export default function App({ Component, pageProps }: AppProps) {
  console.log("APP", { pageProps })
  return (
    <Layout>
      <Component {...pageProps} />
    </Layout>
  )
}
