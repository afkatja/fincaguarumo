import { BlockContent } from "sanity.types"
import type { ImageWithMetadata } from "sanity.types"
import { ImageWithFallback } from "./ImageWithFallback"
import { urlFor } from "../sanity/lib/image"

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
            {/* Render block content here */}
            {block._type === "block" && (
              <p className="portable-text-p mb-6 leading-7">
                {block.children?.map((child: any, childIndex: number) => (
                  <span key={childIndex}>{child.text}</span>
                ))}
              </p>
            )}
            {block._type === "imageWithMetadata" && (
              <ImageWithFallback
                src={block.url || urlFor(block).url()}
                alt={block.alt || ""}
                width={block.metadata?.dimensions?.width || 800}
                height={block.metadata?.dimensions?.height || 600}
                blurDataURL={block.metadata?.lqip}
                quality={80}
                unoptimized={false}
                author={block.author}
                caption={block.caption}
                sourceUrl={block.sourceUrl}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

export default ColumnsBlock
