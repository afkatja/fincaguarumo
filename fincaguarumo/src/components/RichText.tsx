import { PortableText, PortableTextReactComponents } from "next-sanity"

import Image from "next/image"

import Title from "./Title"
import { urlFor } from "../sanity/lib/image"
import Link from "next/link"
import ExternalLink from "./icons/ExternalLink"

import { Link as IntlLink } from "../navigation"
import { ImageWithFallback } from "./ImageWithFallback"
import ColumnsBlock from "./ColumnsBlock"

// Helper function to extract plain text from ReactNode
const getPlainTextFromNode = (node: any): string => {
  if (typeof node === "string") {
    return node
  }
  if (Array.isArray(node)) {
    return node.map(getPlainTextFromNode).join("")
  }
  if (node && typeof node === "object" && node.props) {
    return getPlainTextFromNode(node.props.children)
  }
  return ""
}

// Helper function to slugify text
const slugify = (text: string): string => {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "") // Remove special characters
    .replace(/[\s_-]+/g, "-") // Replace spaces and underscores with hyphens
    .replace(/^-+|-+$/g, "") // Remove leading/trailing hyphens
}

// Export components object for reuse in other components
export const portableTextComponents: Partial<PortableTextReactComponents> = {
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
          title: "",
        }}
      />
    ),
    h2: ({ children }) => (
      <Title
        titleClassName="text-2xl font-bold text-guarumo-primary col-span-2 dark:text-zinc-50 my-6!"
        title={children}
        icon={{
          iconClassName: "fill-guarumo-accent dark:fill-zinc-50",
          title: "",
        }}
        id={slugify(getPlainTextFromNode(children))}
      />
    ),
  },
  types: {
    image: ({ value }) => (
      <Image
        src={urlFor(value).url()}
        alt={value.alt || ""}
        width={1024}
        height={700}
        className="mt-0"
      />
    ),
    imageWithMetadata: ({ value }) => (
      <ImageWithFallback
        src={value.url || urlFor(value).url()}
        alt={value.alt || ""}
        width={value.metadata?.dimensions?.width || 1024}
        height={value.metadata?.dimensions?.height || 700}
        className="mt-0"
        blurDataURL={value.metadata?.lqip}
        quality={75}
        unoptimized={false}
        attribution={{
          author: value.author,
          caption: value.caption,
          sourceUrl: value.sourceUrl,
        }}
      />
    ),
    columnsBlock: ({ value }) => <ColumnsBlock value={value} />,
  },

  marks: {
    internalLink: ({ value, children }) => {
      return (
        <IntlLink
          href={value.slug.current}
          className="fancy-underline dark:text-zinc-100"
        >
          {children}
        </IntlLink>
      )
    },
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

const RichText = ({
  body,
  icon,
  className,
  columns,
}: {
  body: any
  icon?: string
  className?: string
  columns?: boolean
}) => {
  if (!body) return null

  return (
    <div
      className={`prose prose-lg w-11/12! mx-auto py-2 leading-relaxed ${className || ""}`}
    >
      <PortableText value={body} components={portableTextComponents} />
    </div>
  )
}

export default RichText
