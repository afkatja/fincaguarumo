import { ImageProps } from "next/image"
import Image from "next/image"
import ExternalLink from "./icons/ExternalLink"
import Link from "next/link"
import ImageWithArtDirection from "./ImageWithArtDirection"

type ImageWithFallbackProps = Omit<ImageProps, "onError"> & {
  fallbackClassName?: string
  blurDataURL?: string
  author?: string
  caption?: string
  sourceUrl?: string
  [prop: string]: any
}

export const ImageWithFallback = ({
  src,
  alt,
  className,
  fallbackClassName,
  sizes = "(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 1200px",
  priority,
  quality,
  loader,
  unoptimized,
  fill,
  width,
  height,
  placeholder,
  blurDataURL,
  fetchPriority,
  author,
  caption,
  sourceUrl,
  ...rest
}: ImageWithFallbackProps) => {
  // Only use blur placeholder if blurDataURL is provided
  const shouldUseBlur = blurDataURL !== undefined
  const hasAttribution = author || caption || sourceUrl

  const imgWidth = typeof width === "number" ? width : 2016
  const imgHeight = typeof height === "number" ? height : 1134
  const hasArtDirection = rest.mobile || rest.tablet || rest.desktop

  return (
    <figure className={`relative ${className || ""}`}>
      {hasArtDirection ? (
        <ImageWithArtDirection
          mobile={rest.mobile}
          tablet={rest.tablet}
          desktop={rest.desktop}
          width={imgWidth}
          height={imgHeight}
          quality={quality}
          sizes={sizes}
          loader={loader}
          unoptimized={unoptimized}
          src={typeof src === "string" ? src : ""}
          alt={alt}
          priority={priority}
          fill={fill}
          placeholder={shouldUseBlur ? "blur" : placeholder}
        />
      ) : (
        <Image
          src={typeof src === "string" ? src : ""}
          alt={alt}
          width={imgWidth}
          height={imgHeight}
          quality={quality}
          sizes={sizes}
          loader={loader}
          unoptimized={unoptimized}
          priority={priority}
          fill={fill}
          placeholder={shouldUseBlur ? "blur" : placeholder}
          {...rest}
        />
      )}
      {hasAttribution && (
        <figcaption className="mt-2 text-sm text-zinc-500 dark:text-zinc-400 flex items-center">
          {caption && <span className="block">{caption}</span>}
          {(author || sourceUrl) && (
            <span className="block mt-0.5 lg:ml-auto">
              {author && <span>&copy; {author}</span>}
              {author && sourceUrl && <span className="mx-1">·</span>}
              {sourceUrl && (
                <Link
                  href={sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-0.5 text-guarumo-accent hover:underline"
                >
                  Source
                  <ExternalLink width={12} height={12} className="shrink-0" />
                </Link>
              )}
            </span>
          )}
        </figcaption>
      )}
    </figure>
  )
}
