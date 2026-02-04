"use client"
import { ImageProps } from "next/image"
import { useState } from "react"
import Image from "next/image"
import { Source } from "./Source"
import ImageFallback from "./imageFallback"
import ExternalLink from "./icons/ExternalLink"
import Link from "next/link"

type ImageWithFallbackProps = Omit<ImageProps, "onError"> & {
  fallbackClassName?: string
  blurDataURL?: string
  author?: string
  caption?: string
  sourceUrl?: string
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
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)

  const handleError = () => {
    setHasError(true)
    setIsLoading(false)
  }

  const handleLoad = () => {
    setIsLoading(false)
  }

  // Only use blur placeholder if blurDataURL is provided
  const shouldUseBlur = blurDataURL !== undefined
  const hasAttribution = author || caption || sourceUrl
  console.log("on load", isLoading)

  return (
    <figure className={`relative ${className || ""}`}>
      {hasError ? (
        <ImageFallback loading={false} />
      ) : (
        <>
          <ImageFallback loading={!isLoading} />
          <picture>
            {sizes && (
              <Source
                src={src}
                loader={loader}
                unoptimized={unoptimized}
                quality={quality}
                sizes={sizes}
              />
            )}
            <Image
              src={src}
              alt={alt}
              sizes={sizes}
              priority={priority}
              quality={quality}
              loader={loader}
              unoptimized={unoptimized}
              fill={fill}
              width={width}
              height={height}
              placeholder={shouldUseBlur ? "blur" : undefined}
              blurDataURL={blurDataURL}
              fetchPriority={fetchPriority}
              onError={handleError}
              onLoad={handleLoad}
              className={`transition-opacity duration-700 ${
                isLoading ? "opacity-0" : "opacity-100"
              }`}
              {...rest}
            />
          </picture>
          {hasAttribution && (
            <figcaption className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
              {caption && <span className="block">{caption}</span>}
              {(author || sourceUrl) && (
                <span className="block mt-0.5">
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
                      <ExternalLink
                        width={12}
                        height={12}
                        className="shrink-0"
                      />
                    </Link>
                  )}
                </span>
              )}
            </figcaption>
          )}
        </>
      )}
    </figure>
  )
}
