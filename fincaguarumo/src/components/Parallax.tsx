"use client"
import {
  Parallax as ParallaxContainer,
  ParallaxLayer,
} from "@react-spring/parallax"
import React from "react"

interface IParallax {
  parallaxImage:
    | string
    | {
        src?: string
        offset?: number
        factor?: number
        speed?: number
        [prop: string]: any
      }[]
  children?: React.ReactElement | React.ReactElement[]
  [prop: string]: any
}
const Parallax: React.FC<IParallax> = ({
  parallaxImage,
  children,
  ...props
}) => {
  return (
    <ParallaxContainer
      pages={2}
      className={`parallax-container ${props.className}`}
    >
      {Array.isArray(parallaxImage) ? (
        parallaxImage.map(img => {
          const src = img.src ? { backgroundImage: `url(${img.src})` } : {}
          const style = {
            ...src,
            ...img.style,
          }
          return (
            <ParallaxLayer
              {...img}
              style={style}
              key={crypto.randomUUID()}
              offset={img.offset ?? 0}
              factor={img.factor ?? 1}
              speed={img.speed ?? 1}
              className={img.className ?? `parallax-layer`}
            >
              {img.children ?? children}
            </ParallaxLayer>
          )
        })
      ) : (
        <ParallaxLayer
          offset={0}
          speed={0}
          className="parallax-layer"
          style={{ backgroundImage: `url(${parallaxImage})` }}
        >
          {children}
        </ParallaxLayer>
      )}
      {children ?? (
        <ParallaxLayer offset={1} speed={1}>
          {children}
        </ParallaxLayer>
      )}
    </ParallaxContainer>
  )
}

export default Parallax
