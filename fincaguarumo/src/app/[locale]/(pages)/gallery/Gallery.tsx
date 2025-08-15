"use client"
import React, { useState } from "react"
import { urlFor } from "../../../../sanity/lib/image"
import Image from "next/image"
import { SanityImageObject } from "../../../../types"

const Gallery = ({ gallery }: { gallery: { item: SanityImageObject }[] }) => {
  const [active, setActive] = useState<null | number>(null)

  return (
    <section className="flex flex-wrap items-stretch -mx-[25%]">
      {gallery.map((item, i) => (
        <div
          className={`m-2 h-[700px] gallery-item overflow-hidden ${active === i ? "active" : ""}`}
          key={item.item.asset._ref}
          onClick={() => setActive(i)}
        >
          <Image
            src={urlFor(item.item)
              .width(1200)
              .height(700)
              .format("webp")
              .quality(85)
              .url()}
            alt={item.item.alt || ""}
            width={1200}
            height={700}
            sizes="(min-width: 1024px) 1200px, 100vw"
            loading="lazy"
            decoding="async"
          />
        </div>
      ))}
    </section>
  )
}

export default Gallery
