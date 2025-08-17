import { PortableText, PortableTextReactComponents } from "next-sanity"

import Image from "next/image"

import Title from "./Title"
import { urlFor } from "../sanity/lib/image"
import Link from "next/link"
import ExternalLink from "./icons/ExternalLink"

const RichText = ({
  body,
  icon,
  className,
}: {
  body: any
  icon?: string
  className?: string
}) => {
  if (!body) return
  const components: Partial<PortableTextReactComponents> = {
    block: {
      normal: ({ children }) => (
        <p className="portable-text-p mb-6 leading-7">{children}</p>
      ),
      blockquote: ({ children }) => <p>{children}</p>,
      h1: ({ children }) => (
        <Title
          Heading="h1"
          titleClassName="col-span-2 dark:text-zinc-50 !y-6"
          title={children}
          icon={{
            iconClassName: "fill-guarumo-accent dark:fill-zinc-50",
            title: icon,
          }}
        />
      ),
      h2: ({ children }) => (
        <Title
          titleClassName="col-span-2 dark:text-zinc-50 !my-6"
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
      link: ({ value, children }) => {
        const { blank, href } = value
        if (!href) return null

        const target = blank ? "_blank" : "_self"
        const rel = blank ? "noopener noreferrer" : undefined
        return (
          <Link
            href={href}
            target={target}
            rel={rel}
            className="fancy-underline dark:text-zinc-100"
          >
            <ExternalLink />
            {children}
          </Link>
        )
      },
      strong: ({ value, children }) => (
        <strong className="dark:text-zinc-100 font-bold">{children}</strong>
      ),
    },
  }

  return (
    <div
      className={`prose prose-lg !w-11/12 mx-auto py-2 leading-relaxed ${className}`}
    >
      <PortableText value={body} components={components} />
    </div>
  )
}

export default RichText
