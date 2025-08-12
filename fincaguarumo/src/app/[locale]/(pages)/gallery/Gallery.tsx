"use client"
import React, { useState } from "react"
import { urlFor } from "../../../../sanity/lib/image"
import Image from "next/image"
import type { SanityImageObject } from "@sanity/image-url/lib/types/types"

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
          <Image src={urlFor(item).url()} alt={""} width={1200} height={700} />
        </div>
      ))}
    </section>
  )
}

export default Gallery
