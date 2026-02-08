import { ImageProps } from "next/image"

// Props that are specific to ImageWithFallback's functionality
export interface ImageWithFallbackSpecificProps {
  blurDataURL?: string
  author?: string
  caption?: string
  sourceUrl?: string
}

// Props related to art direction (breakpoint-specific images)
export interface ArtDirectionProps {
  mobile?: string
  tablet?: string
  desktop?: string
}

// Props related to image attribution
export interface ImageAttributionProps {
  author?: string
  caption?: string
  sourceUrl?: string
}

// Props that are passed through to Next.js Image component
export interface ImageWithFallbackImageProps extends Omit<
  ImageProps,
  "src" | "alt"
> {
  src: string | ImageProps["src"]
  alt: string
}

// Complete props interface for ImageWithFallback
export interface ImageWithFallbackProps extends ImageWithFallbackImageProps {
  attribution?: ImageAttributionProps
  artDirection?: ArtDirectionProps
  blurDataURL?: string
}

// Props specific to ImageWithArtDirection's functionality
export interface ImageWithArtDirectionSpecificProps {
  mobile?: string
  tablet?: string
  desktop?: string
}

// Complete props interface for ImageWithArtDirection
export interface ImageWithArtDirectionProps extends Omit<
  ImageProps,
  "src" | "alt"
> {
  src: string
  alt: string
  attribution?: ImageAttributionProps
  artDirection?: ArtDirectionProps
}

// Props for Source component
export interface SourceProps extends Omit<
  React.ComponentProps<"source">,
  "srcSet" | "src"
> {
  src: string
  loader?: ImageProps["loader"]
  unoptimized?: boolean
  quality?: number
}
