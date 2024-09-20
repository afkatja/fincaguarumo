import React, { ReactNode } from "react"

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
          <h1 className="text-3xl mt-5">{featuredContentTitle}</h1>
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
