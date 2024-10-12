import { ImageProps, getImageProps } from "next/image"
import { forwardRef } from "react"

type SourceProps = Omit<JSX.IntrinsicElements["source"], "srcSet" | "src"> &
  Pick<ImageProps, "src" | "loader" | "unoptimized" | "quality">

export const Source = forwardRef<HTMLSourceElement, SourceProps>(
  function Source({ src, loader, unoptimized, quality, ...rest }, ref) {
    const {
      props: { srcSet },
    } = getImageProps({
      src,
      loader,
      unoptimized,
      quality,
      fill: true,
      alt: "",
    })

    return <source {...rest} srcSet={srcSet} ref={ref} />
  }
)
