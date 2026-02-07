import { ImageProps } from "next/image"
import Image from "next/image"
import ExternalLink from "./icons/ExternalLink"
import Link from "next/link"
import ImageWithArtDirection from "./ImageWithArtDirection"
import {
  ImageWithFallbackProps,
  ImageAttributionProps,
  ArtDirectionProps,
} from "./imageProps"

export const ImageWithFallback = ({
  src,
  alt,
  className,
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
  attribution,
  artDirection,
  ...rest
}: ImageWithFallbackProps) => {
  // Only use blur placeholder if blurDataURL is provided
  const shouldUseBlur = blurDataURL !== undefined
  const hasAttribution =
    attribution?.author || attribution?.caption || attribution?.sourceUrl

  const imgWidth = typeof width === "number" ? width : 2016
  const imgHeight = typeof height === "number" ? height : 1134
  const hasArtDirection =
    artDirection?.mobile || artDirection?.tablet || artDirection?.desktop

  return (
    <figure className={`relative ${className || ""}`}>
      {hasArtDirection ? (
        <ImageWithArtDirection
          quality={quality}
          sizes={sizes}
          loader={loader}
          unoptimized={unoptimized}
          src={typeof src === "string" ? src : ""}
          alt={alt}
          priority={priority}
          fill={fill}
          placeholder={shouldUseBlur ? "blur" : placeholder}
          blurDataURL={blurDataURL}
          fetchPriority={fetchPriority}
          artDirection={artDirection}
          {...(fill ? {} : { width: imgWidth, height: imgHeight })}
        />
      ) : (
        <Image
          src={typeof src === "string" ? src : ""}
          alt={alt}
          quality={quality}
          sizes={sizes}
          loader={loader}
          unoptimized={unoptimized}
          priority={priority}
          fill={fill}
          placeholder={shouldUseBlur ? "blur" : placeholder}
          blurDataURL={blurDataURL}
          fetchPriority={fetchPriority}
          {...rest}
          {...(fill ? {} : { width: imgWidth, height: imgHeight })}
        />
      )}
      {hasAttribution && (
        <figcaption className="mt-2 text-sm text-zinc-500 dark:text-zinc-400 flex items-center">
          {attribution?.caption && (
            <span className="block">{attribution.caption}</span>
          )}
          {(attribution?.author || attribution?.sourceUrl) && (
            <span className="block mt-0.5 lg:ml-auto">
              {attribution?.author && <span>&copy; {attribution.author}</span>}
              {attribution?.author && attribution?.sourceUrl && (
                <span className="mx-1">·</span>
              )}
              {attribution?.sourceUrl && (
                <Link
                  href={attribution.sourceUrl}
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
