import { urlFor } from "@/sanity/lib/image"
import type { SanityImageSource } from "@sanity/image-url"

const BREAKPOINTS = [
  { width: 640, height: 360 },
  { width: 1024, height: 576 },
  { width: 2016, height: 1134 },
] as const

/** Single Sanity image (imageWithMetadata) with asset, crop, hotspot, alt */
export type ImageWithMetadata = SanityImageSource & {
  metadata?: { lqip?: string }
  alt?: string
}

/** Art-directed image with optional breakpoint-specific crops */
export type ArtDirectedImage = {
  _type: "artDirectedImage"
  desktop?: ImageWithMetadata
  tablet?: ImageWithMetadata
  mobile?: ImageWithMetadata
}

/** Union: single image or art-directed image (gallery/slideshow input) */
export type GalleryImage = ImageWithMetadata | ArtDirectedImage

function isArtDirected(img: GalleryImage): img is ArtDirectedImage {
  return img && "_type" in img && img._type === "artDirectedImage"
}

function hasAsset(img: unknown): img is ImageWithMetadata {
  return (
    img != null &&
    typeof img === "object" &&
    "asset" in img &&
    (img as any).asset != null
  )
}

function buildResponsiveUrls(img: ImageWithMetadata) {
  const base = urlFor(img).fit("crop").quality(100).format("webp")
  return {
    src: base.width(2016).height(1134).url(),
    srcSet: BREAKPOINTS.map(
      ({ width, height }) =>
        `${urlFor(img).fit("crop").quality(100).format("webp").width(width).height(height).url()} ${width}w`,
    ).join(", "),
    width: 2016,
    height: 1134,
    alt: (img as ImageWithMetadata & { alt?: string }).alt || "",
    metadata: img.metadata,
  }
}

export type CarouselImage = {
  src: string
  srcSet?: string
  alt: string
  width: number
  height: number
  metadata?: { lqip?: string }
  mobile?: string
  tablet?: string
  desktop?: string
}

export function normalizeToCarouselImages(
  images: GalleryImage[] | null | undefined,
): CarouselImage[] {
  if (!images || !Array.isArray(images)) return []

  return images
    .map((item): CarouselImage | null => {
      if (isArtDirected(item)) {
        const desktop = item.desktop
        if (!desktop || !hasAsset(desktop)) return null
        const alt = (desktop as ImageWithMetadata & { alt?: string }).alt || ""
        const metadata = desktop.metadata

        const buildUrl = (img: ImageWithMetadata, w: number, h: number) =>
          urlFor(img)
            .fit("crop")
            .quality(100)
            .format("webp")
            .width(w)
            .height(h)
            .url()

        return {
          src: buildUrl(desktop, 2016, 1134),
          alt,
          width: 2016,
          height: 1134,
          metadata,
          mobile:
            item.mobile && hasAsset(item.mobile)
              ? buildUrl(item.mobile, 640, 360)
              : undefined,
          tablet:
            item.tablet && hasAsset(item.tablet)
              ? buildUrl(item.tablet, 1024, 576)
              : undefined,
          desktop: buildUrl(desktop, 2016, 1134),
        }
      }

      if (!hasAsset(item)) return null
      const base = buildResponsiveUrls(item)
      return { ...base }
    })
    .filter((x): x is CarouselImage => x != null)
}
