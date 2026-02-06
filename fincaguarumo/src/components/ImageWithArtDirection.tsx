"use client"
import { useState } from "react"
import { Source } from "./Source"
import Image, { ImageProps } from "next/image"
import ImageFallback from "./imageFallback"

export type TImage = ImageProps & {
  src: string
  srcSet?: string
  alt: string
  width?: number
  height?: number
  metadata?: { lqip?: string }
  mobile?: string
  tablet?: string
  desktop?: string
}

const ImageWithArtDirection = ({
  mobile,
  tablet,
  desktop,
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
  onError,
  onLoad,
  className,
  ...rest
}: TImage) => {
  const fallbackSrc = desktop || src
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
        <ImageFallback loading={false} />
      ) : (
        <ImageFallback loading={!isLoading} />
      )}
      <picture>
        {mobile && (
          <source
            media="(max-width: 640px)"
            srcSet={mobile}
            width={640}
            height={360}
          />
        )}
        {tablet && (
          <source
            media="(max-width: 1024px)"
            srcSet={tablet}
            width={1024}
            height={576}
          />
        )}
        <Source
          src={fallbackSrc}
          loader={loader}
          unoptimized={unoptimized}
          quality={quality}
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
          className={`transition-opacity duration-700 ${
            isLoading ? "opacity-0" : "opacity-100"
          }`}
          {...rest}
        />
      </picture>
    </>
  )
}

export default ImageWithArtDirection
