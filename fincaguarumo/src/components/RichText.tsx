import { PortableText, PortableTextReactComponents } from "next-sanity"

import Image from "next/image"

import Title from "./Title"
import resolveConfig from "tailwindcss/resolveConfig"
import theme from "../../tailwind.config"
import { urlFor } from "../sanity/lib/image"
import Link from "next/link"

const RichText = ({ body, icon }: { body: any; icon?: string }) => {
  if (!body) return
  const components: Partial<PortableTextReactComponents> = {
    block: {
      normal: ({ children }) => <p className="portable-text-p">{children}</p>,
      blockquote: ({ children }) => <p>{children}</p>,
      h2: ({ children }) => (
        <Title
          titleClassName="col-span-2 dark:text-zinc-50"
          title={children}
          icon={{
            iconClassName: "fill-guarumo-accent dark:fill-zinc-50",
            title: icon,
          }}
        />
      ),
    },
    types: {
      image: ({ value }) => (
        <Image
          src={urlFor(value).url()}
          alt=""
          width={1024}
          height={700}
          className="mt-0"
        />
      ),
    },

    marks: {
      internalLink: ({ value, children }) => (
        <Link
          href={value.slug.current}
          className="fancy-underline dark:text-zinc-100"
        >
          {children}
        </Link>
      ),
      strong: ({ value, children }) => (
        <strong className="dark:text-zinc-100 font-bold">{children}</strong>
      ),
    },
  }

  return (
    <div className="prose lg:prose-lg py-8 w-11/12 mx-auto md:grid md:grid-cols-2 gap-5">
      <PortableText value={body} components={components} />
    </div>
  )
}

export default RichText
