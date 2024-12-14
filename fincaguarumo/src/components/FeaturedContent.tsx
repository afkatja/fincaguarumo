import React, { ReactNode } from "react"
import Title from "./Title"
import Icon from "./Icon"
import Link from "next/link"

const FeaturedContent = ({
  featuredContentTitle,
  items,
  href,
}: {
  featuredContentTitle?: string
  items: { content: ReactNode }[]
  href: string
}) => {
  return (
    <article className="relative z-10 content-wrap">
      <div className="w-11/12 mx-auto py-5 lg:px-40">
        {featuredContentTitle && (
          <Title titleClassName="text-3xl mt-5" title={featuredContentTitle} />
        )}
        <ul className="md:grid lg:grid-cols-5 md:grid-cols-3 gap-4 md:-mx-5">
          {items.map(item => (
            <li
              key={crypto.randomUUID()}
              className="md:m-5 my-5 md:w-56 fade-in"
            >
              {item.content}
            </li>
          ))}
          <li className="md:m-5 my-5 md:w-56 fade-in">
            <Link
              href={href}
              className="flex flex-wrap items-center justify-center h-full group no-underline"
            >
              <Icon
                icon="ArrowRight"
                className="h-8 w-8 transition-all group-hover:translate-x-3 stroke-guarumo-accent dark:stroke-zinc-50"
                color="currentColor"
              />
            </Link>
          </li>
        </ul>
      </div>
    </article>
  )
}

export default FeaturedContent
