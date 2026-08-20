import React, { forwardRef, type SelectHTMLAttributes } from 'react'
import './primitives.css'

export interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  label?: string
  error?: string
  helperText?: string
  placeholder?: string
  options: SelectOption[]
  size?: 'sm' | 'md' | 'lg'
}

export interface SelectOption {
  value: string
  label: string
  disabled?: boolean
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, helperText, placeholder, options, size = 'md', className = '', id, ...props }, ref) => {
    const selectId = id || label?.toLowerCase().replace(/\s+/g, '-')

    return (
      <div className="moto-pos-select-wrapper">
        {label && (
          <label htmlFor={selectId} className="moto-pos-label">
            {label}
          </label>
        )}
        <div className="moto-pos-select-container">
          <select
            ref={ref}
            id={selectId}
            className={`moto-pos-select moto-pos-select--${size} ${error ? 'moto-pos-select--error' : ''} ${className}`}
            aria-invalid={error ? 'true' : 'false'}
            aria-describedby={error ? `${selectId}-error` : helperText ? `${selectId}-helper` : undefined}
            {...props}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((option) => (
              <option key={option.value} value={option.value} disabled={option.disabled}>
                {option.label}
              </option>
            ))}
          </select>
          <span className="moto-pos-select-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 9l6 6 6-6" />
            </svg>
          </span>
        </div>
        {error && (
          <p id={`${selectId}-error`} className="moto-pos-input-error" role="alert">
            {error}
          </p>
        )}
        {helperText && !error && (
          <p id={`${selectId}-helper`} className="moto-pos-input-helper">
            {helperText}
          </p>
        )}
      </div>
    )
  }
)

Select.displayName = 'Select'