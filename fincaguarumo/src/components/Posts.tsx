import Link from "next/link"
import Image from "next/image"

import { POSTS_QUERYResult } from "../../sanity.types"
import { urlFor } from "../sanity/lib/image"

export function Posts({ posts }: { posts: POSTS_QUERYResult }) {
  return (
    <ul className="flex gap-2 w-11/12 mx-auto flex-wrap justify-center">
      {posts.map(post => (
        <li key={post._id} className="md:m-5 my-5 flex-initial md:w-56 w-full">
          <Link
            className="group no-underline flex flex-col items-center justify-content"
            href={`/blog/${post?.slug?.current}`}
          >
            {post?.mainImage && (
              <Image
                src={urlFor(post.mainImage).width(300).height(300).url()}
                width={300}
                height={300}
                alt=""
              />
            )}
            <h1 className="my-3">{post?.title}</h1>
          </Link>
        </li>
      ))}
    </ul>
  )
}
