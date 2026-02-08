"use client"
import { useState } from "react"
import { Source } from "./Source"
import Image, { ImageProps } from "next/image"
import ImageFallback from "./imageFallback"
import { clsx } from "clsx"
import {
  ImageWithArtDirectionProps,
  ImageAttributionProps,
  ArtDirectionProps,
} from "./imageProps"

const ImageWithArtDirection = ({
  quality,
  sizes,
  loader,
  unoptimized,
  src,
  alt,
  priority,
  fill,
  width,
  height,
  placeholder,
  blurDataURL,
  fetchPriority,
  className,
  attribution,
  artDirection,
  ...rest
}: ImageWithArtDirectionProps) => {
  const fallbackSrc = artDirection?.desktop || src
  const shouldUseBlur = blurDataURL !== undefined

  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)

  const handleError = () => {
    setHasError(true)
    setIsLoading(false)
  }

  const handleLoad = () => {
    setIsLoading(false)
  }

  return (
    <>
      {hasError ? (
        <ImageFallback shouldHideFallback={false} />
      ) : (
        <ImageFallback shouldHideFallback={!isLoading} />
      )}
      {!hasError && (
        <picture>
          {artDirection?.mobile && (
            <source
              media="(max-width: 640px)"
              srcSet={artDirection.mobile}
              width={640}
              height={360}
            />
          )}
          {artDirection?.tablet && (
            <source
              media="(max-width: 1024px)"
              srcSet={artDirection.tablet}
              width={1024}
              height={576}
            />
          )}
          <Source
            src={fallbackSrc}
            loader={loader}
            unoptimized={unoptimized}
            quality={quality ? Number(quality) : undefined}
            sizes={sizes}
          />

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
            className={clsx(
              "transition-opacity duration-700",
              {
                "opacity-0": isLoading,
                "opacity-100": !isLoading,
              },
              className,
            )}
            {...rest}
          />
        </picture>
      )}
    </>
  )
}

export default ImageWithArtDirection
