import React, { type HTMLAttributes, forwardRef } from 'react'
import './primitives.css'

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'outlined' | 'elevated'
  padding?: 'none' | 'sm' | 'md' | 'lg'
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ variant = 'default', padding = 'md', className = '', children, ...props }, ref) => (
    <div
      ref={ref}
      className={`moto-pos-card moto-pos-card--${variant} moto-pos-card--p-${padding} ${className}`}
      {...props}
    >
      {children}
    </div>
  )
)

Card.displayName = 'Card'

export type CardHeaderProps = HTMLAttributes<HTMLDivElement>

export const CardHeader = forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ className = '', children, ...props }, ref) => (
    <div ref={ref} className={`moto-pos-card-header ${className}`} {...props}>
      {children}
    </div>
  )
)

CardHeader.displayName = 'CardHeader'

export type CardTitleProps = HTMLAttributes<HTMLHeadingElement>

export const CardTitle = forwardRef<HTMLHeadingElement, CardTitleProps>(
  ({ className = '', children, ...props }, ref) => (
    <h3 ref={ref} className={`moto-pos-card-title ${className}`} {...props}>
      {children}
    </h3>
  )
)

CardTitle.displayName = 'CardTitle'

export type CardDescriptionProps = HTMLAttributes<HTMLParagraphElement>

export const CardDescription = forwardRef<HTMLParagraphElement, CardDescriptionProps>(
  ({ className = '', children, ...props }, ref) => (
    <p ref={ref} className={`moto-pos-card-description ${className}`} {...props}>
      {children}
    </p>
  )
)

CardDescription.displayName = 'CardDescription'

export type CardContentProps = HTMLAttributes<HTMLDivElement>

export const CardContent = forwardRef<HTMLDivElement, CardContentProps>(
  ({ className = '', children, ...props }, ref) => (
    <div ref={ref} className={`moto-pos-card-content ${className}`} {...props}>
      {children}
    </div>
  )
)

CardContent.displayName = 'CardContent'

export type CardFooterProps = HTMLAttributes<HTMLDivElement>

export const CardFooter = forwardRef<HTMLDivElement, CardFooterProps>(
  ({ className = '', children, ...props }, ref) => (
    <div ref={ref} className={`moto-pos-card-footer ${className}`} {...props}>
      {children}
    </div>
  )
)

CardFooter.displayName = 'CardFooter'