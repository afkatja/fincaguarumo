import React, { ReactNode } from "react"
import Icon from "./Icon"
import Title from "./Title"

const FeaturedContent = ({
  featuredContentTitle,
  items,
}: {
  featuredContentTitle?: string
  items: { content: ReactNode }[]
}) => {
  return (
    <article className="fade-in relative z-10 bg-white">
      <div className="w-11/12 mx-auto py-5">
        {featuredContentTitle && (
          <Title
            titleClassName="text-3xl mt-5"
            iconClassName="inline fill-guarumo-secondary mr-3"
            title={featuredContentTitle}
          />
        )}
        <ul className="tours-featured flex flex-wrap gap-2 md:-mx-5">
          {items.map(item => (
            <li
              key={crypto.randomUUID()}
              className="tour-featured md:m-5 my-5 flex-initial md:w-56 w-full"
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
