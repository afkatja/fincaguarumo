import React, { ReactNode } from "react"
import Title from "./Title"

const FeaturedContent = ({
  featuredContentTitle,
  items,
}: {
  featuredContentTitle?: string
  items: { content: ReactNode }[]
}) => {
  return (
    <article className="relative z-10 bg-white">
      <div className="w-11/12 mx-auto py-5">
        {featuredContentTitle && (
          <Title titleClassName="text-3xl mt-5" title={featuredContentTitle} />
        )}
        <ul className="flex flex-wrap gap-2 md:-mx-5">
          {items.map(item => (
            <li
              key={crypto.randomUUID()}
              className="md:m-5 my-5 flex-initial md:w-56 w-full fade-in"
            >
              {item.content}
            </li>
          ))}
        </ul>
      </div>
    </article>
  )
}

export default FeaturedContent
