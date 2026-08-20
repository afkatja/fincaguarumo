import React, { forwardRef, type InputHTMLAttributes, type LabelHTMLAttributes } from 'react'
import './primitives.css'

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string
  error?: string
  helperText?: string
  size?: 'sm' | 'md' | 'lg'
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, size = 'md', className = '', id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-')

    return (
      <div className="moto-pos-input-wrapper">
        {label && (
          <label htmlFor={inputId} className="moto-pos-label">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={`moto-pos-input moto-pos-input--${size} ${error ? 'moto-pos-input--error' : ''} ${className}`}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined}
          {...props}
        />
        {error && (
          <p id={`${inputId}-error`} className="moto-pos-input-error" role="alert">
            {error}
          </p>
        )}
        {helperText && !error && (
          <p id={`${inputId}-helper`} className="moto-pos-input-helper">
            {helperText}
          </p>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'

export interface LabelProps extends LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean
}

export const Label = forwardRef<HTMLLabelElement, LabelProps>(
  ({ required, children, className = '', ...props }, ref) => (
    <label ref={ref} className={`moto-pos-label ${className}`} {...props}>
      {children}
      {required && <span className="moto-pos-label-required" aria-hidden="true">*</span>}
    </label>
  )
)

Label.displayName = 'Label'