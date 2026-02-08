import { BlockContent } from "sanity.types"
import type { ImageWithMetadata } from "sanity.types"
import { ImageWithFallback } from "./ImageWithFallback"
import { urlFor } from "../sanity/lib/image"
import { PortableText } from "next-sanity"
import { portableTextComponents } from "./RichText"

interface ColumnsBlockProps {
  value: {
    columnCount: string
    content: BlockContent
  }
}

const ColumnsBlock = ({ value }: ColumnsBlockProps) => {
  const { columnCount, content } = value

  if (!columnCount || !content) return null

  const columnClass = columnCount === "2" ? "lg:grid-cols-2" : "lg:grid-cols-3"

  return (
    <div className={`grid ${columnClass} gap-4 my-8`}>
      {content.map((block: any, index: number) => {
        return (
          <div key={index} className="prose prose-lg">
            {/* Render block content using PortableText to preserve rich text formatting */}
            {block._type === "block" && (
              <PortableText
                value={[block]}
                components={portableTextComponents}
              />
            )}
            {block._type === "imageWithMetadata" && (
              <ImageWithFallback
                src={block.url || urlFor(block).url()}
                alt={block.alt || ""}
                width={block.metadata?.dimensions?.width || 800}
                height={block.metadata?.dimensions?.height || 600}
                blurDataURL={block.metadata?.lqip}
                quality={75}
                unoptimized={false}
                attribution={{
                  author: block.author,
                  caption: block.caption,
                  sourceUrl: block.sourceUrl,
                }}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

export default ColumnsBlock
