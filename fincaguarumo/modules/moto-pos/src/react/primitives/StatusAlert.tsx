import React from 'react'
import './primitives.css'

export type AlertVariant = 'success' | 'warning' | 'error' | 'info'

export interface StatusAlertProps {
  variant: AlertVariant
  title?: string
  message: React.ReactNode
  dismissible?: boolean
  onDismiss?: () => void
  className?: string
}

const variantIcons: Record<AlertVariant, React.ReactNode> = {
  success: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  ),
  warning: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  ),
  error: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <line x1="15" y1="9" x2="9" y2="15" />
      <line x1="9" y1="9" x2="15" y2="15" />
    </svg>
  ),
  info: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  ),
}

const variantRoles: Record<AlertVariant, string> = {
  success: 'status',
  warning: 'alert',
  error: 'alert',
  info: 'status',
}

export function StatusAlert({
  variant,
  title,
  message,
  dismissible = false,
  onDismiss,
  className = '',
}: StatusAlertProps) {
  return (
    <div
      className={`moto-pos-alert moto-pos-alert--${variant} ${className}`}
      role={variantRoles[variant]}
      aria-live={variant === 'error' || variant === 'warning' ? 'assertive' : 'polite'}
    >
      <div className="moto-pos-alert-icon" aria-hidden="true">
        {variantIcons[variant]}
      </div>
      <div className="moto-pos-alert-content">
        {title && <h4 className="moto-pos-alert-title">{title}</h4>}
        <div className="moto-pos-alert-message">{message}</div>
      </div>
      {dismissible && onDismiss && (
        <button
          type="button"
          className="moto-pos-alert-dismiss"
          onClick={onDismiss}
          aria-label={`Dismiss ${variant} alert`}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      )}
    </div>
  )
}