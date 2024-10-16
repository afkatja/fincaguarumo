import React, { Suspense } from "react"

import BookingDialog from "./Dialog"

import Icon from "@/components/Icon"
import { TTour } from "./tours/data"
import Breadcrumbs from "../../../components/Breadcrumbs"
import Title from "../../../components/Title"
import { PortableText } from "next-sanity"
import Loading from "./loading"
import Image from "next/image"
import { urlFor } from "../../../sanity/lib/image"
import resolveConfig from "tailwindcss/resolveConfig"
import theme from "../../../../tailwind.config"

const DetailsPageLayout = ({
  title,
  description,
  duration,
  location,
  price,
  slideshow,
  parent,
  body,
}: Omit<TTour, "images"> & {
  slideshow?: React.ReactNode
  parent?: { title: string; href: string }
}) => {
  return (
    <Suspense fallback={<Loading />}>
      <div className="bg-white dark:bg-slate-500">
        <div className="w-11/12 mx-auto py-5">
          {parent && <Breadcrumbs title={title} parent={parent} />}
          <Title
            title={title}
            titleClassName="text-3xl font-bold my-5"
            iconClassName="fill-guarumo-secondary inline mr-2"
          />
        </div>
        {slideshow}
        <section className="prose lg:prose-lg mt-5 mx-auto w-11/12">
          <div className="grid md:grid-cols-2 gap-8 mt-8 md:mt-12">
            <div>
              <h4 className="text-muted-foreground mt-2">{description}</h4>
              <div className="flex items-center gap-4 mt-4">
                {duration && (
                  <div className="flex items-center gap-1">
                    <Icon icon="Clock" className="h-5 w-5 text-primary" />
                    <span>{duration}</span>
                  </div>
                )}
                {location && (
                  <div className="flex items-center gap-1">
                    <Icon icon="Pin" className="h-5 w-5 text-primary" />
                    <span>{location}</span>
                  </div>
                )}
              </div>
            </div>
            <footer className="bg-muted rounded-lg p-6 md:p-8">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-2xl font-bold">${price}</span>
                  <span className="text-muted-foreground text-sm">/person</span>
                </div>
                <BookingDialog
                  price={Number(price)}
                  title={title}
                  description={description}
                />
              </div>
            </footer>
          </div>
          {body && (
            <div className="prose prose-lg mt-8 mx-auto grid md:grid-cols-2 gap-4">
              <PortableText
                value={body}
                components={{
                  block: {
                    normal: ({ children }) => (
                      <p className="portable-text-p">{children}</p>
                    ),
                    blockquote: ({ children }) => <p>{children}</p>,
                    h2: ({ children }) => (
                      <Title
                        titleClassName="col-span-2"
                        title={children}
                        iconClassName="inline mr-5"
                        icon="Cocoa"
                        color={resolveConfig(theme).theme.colors.guarumo.accent}
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
                }}
              />
            </div>
          )}
        </section>
      </div>
    </Suspense>
  )
}

export default DetailsPageLayout
