import { PortableText, PortableTextReactComponents } from "next-sanity"

import Image from "next/image"

import Title from "./Title"
import resolveConfig from "tailwindcss/resolveConfig"
import theme from "../../tailwind.config"
import { urlFor } from "../sanity/lib/image"

const RichText = ({ body, icon }: { body: any; icon?: string }) => {
  if (!body) return
  const components: Partial<PortableTextReactComponents> = {
    block: {
      normal: ({ children }) => <p className="portable-text-p">{children}</p>,
      blockquote: ({ children }) => <p>{children}</p>,
      h2: ({ children }) => (
        <Title
          titleClassName="col-span-2"
          title={children}
          icon={{
            title: icon,
            color: resolveConfig(theme).theme.colors.guarumo.accent,
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
  }

  return (
    <div className="prose prose-lg mt-8 mx-auto md:grid md:grid-cols-2 gap-5">
      <PortableText value={body} components={components} />
    </div>
  )
}

export default RichText
