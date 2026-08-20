# Moto POS Theming Guide

## Overview

Moto POS components are styled using **CSS Custom Properties (CSS Variables)**. This approach provides:

- Zero runtime overhead
- Framework-agnostic (works with React, Vue, Svelte, vanilla JS, etc.)
- Easy theming via CSS overrides
- Native dark mode support via `prefers-color-scheme` or class-based toggling

---

## Installation

### Option 1: Import CSS directly

```tsx
// In your app's global CSS or layout
import '@moto-pos/core/tokens.css'
```

### Option 2: Copy tokens to your globals.css

Copy the contents of `tokens.css` into your project's global stylesheet.

---

## Token Reference

### Colors

| Token | Light Default | Dark Default | Usage |
|-------|--------------|--------------|-------|
| `--moto-pos-color-primary` | `#034b25` | `#4ade80` | Primary actions, links, focus rings |
| `--moto-pos-color-primary-hover` | `#023a1d` | `#22c55e` | Hover states for primary |
| `--moto-pos-color-primary-light` | `#e8f5ee` | `#052e16` | Subtle backgrounds, focus rings |
| `--moto-pos-color-secondary` | `#18181b` | `#f4f4f5` | Secondary buttons, text |
| `--moto-pos-color-accent` | `#9d1f60` | `#f472b6` | Accent elements |
| `--moto-pos-color-success` | `#166534` | `#4ade80` | Success states |
| `--moto-pos-color-success-light` | `#dcfce7` | `#052e16` | Success backgrounds |
| `--moto-pos-color-warning` | `#854d0e` | `#fbbf24` | Warning states |
| `--moto-pos-color-warning-light` | `#fef3c7` | `#422006` | Warning backgrounds |
| `--moto-pos-color-error` | `#991b1b` | `#f87171` | Error states |
| `--moto-pos-color-error-light` | `#fee2e2` | `#450a0a` | Error backgrounds |
| `--moto-pos-color-background` | `#ffffff` | `#09090b` | Page/card backgrounds |
| `--moto-pos-color-surface` | `#fafafa` | `#18181b` | Input surfaces, cards |
| `--moto-pos-color-surface-hover` | `#f4f4f5` | `#27272a` | Hover surfaces |
| `--moto-pos-color-border` | `#e4e4e7` | `#3f3f46` | Borders, dividers |
| `--moto-pos-color-border-focus` | `#034b25` | `#4ade80` | Focus borders |
| `--moto-pos-color-text-primary` | `#18181b` | `#fafafa` | Primary text |
| `--moto-pos-color-text-secondary` | `#52525b` | `#d4d4d8` | Secondary text |
| `--moto-pos-color-text-muted` | `#a1a1aa` | `#71717a` | Placeholders, disabled |
| `--moto-pos-color-text-inverse` | `#ffffff` | `#09090b` | Text on primary backgrounds |
| `--moto-pos-color-overlay` | `rgba(24,24,27,0.5)` | `rgba(250,250,250,0.5)` | Modal overlays |

### Spacing

| Token | Value |
|-------|-------|
| `--moto-pos-space-1` | `0.25rem` (4px) |
| `--moto-pos-space-2` | `0.5rem` (8px) |
| `--moto-pos-space-3` | `0.75rem` (12px) |
| `--moto-pos-space-4` | `1rem` (16px) |
| `--moto-pos-space-5` | `1.25rem` (20px) |
| `--moto-pos-space-6` | `1.5rem` (24px) |
| `--moto-pos-space-8` | `2rem` (32px) |
| `--moto-pos-space-10` | `2.5rem` (40px) |
| `--moto-pos-space-12` | `3rem` (48px) |

### Border Radius

| Token | Value |
|-------|-------|
| `--moto-pos-radius-sm` | `0.375rem` (6px) |
| `--moto-pos-radius-md` | `0.5rem` (8px) |
| `--moto-pos-radius-lg` | `0.75rem` (12px) |
| `--moto-pos-radius-full` | `9999px` |

### Shadows

| Token | Value |
|-------|-------|
| `--moto-pos-shadow-sm` | `0 1px 2px 0 rgba(0,0,0,0.05)` |
| `--moto-pos-shadow-md` | `0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.1)` |
| `--moto-pos-shadow-lg` | `0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -4px rgba(0,0,0,0.1)` |
| `--moto-pos-shadow-focus` | `0 0 0 3px var(--moto-pos-color-primary-light)` |

### Transitions

| Token | Value |
|-------|-------|
| `--moto-pos-transition-fast` | `150ms ease` |
| `--moto-pos-transition-normal` | `200ms ease` |

### Typography

| Token | Value |
|-------|-------|
| `--moto-pos-font-sans` | System UI stack |
| `--moto-pos-font-mono` | UI Monospace stack |
| `--moto-pos-text-xs` | `0.75rem` |
| `--moto-pos-text-sm` | `0.875rem` |
| `--moto-pos-text-base` | `1rem` |
| `--moto-pos-text-lg` | `1.125rem` |
| `--moto-pos-text-xl` | `1.25rem` |
| `--moto-pos-text-2xl` | `1.5rem` |
| `--moto-pos-font-normal` | `400` |
| `--moto-pos-font-medium` | `500` |
| `--moto-pos-font-semibold` | `600` |
| `--moto-pos-font-bold` | `700` |

### Z-Index

| Token | Value |
|-------|-------|
| `--moto-pos-z-dropdown` | `100` |
| `--moto-pos-z-modal` | `200` |
| `--moto-pos-z-toast` | `300` |
| `--moto-pos-z-tooltip` | `400` |

---

## Custom Theming

### Override via CSS

```css
/* In your globals.css after importing tokens.css */
:root {
  --moto-pos-color-primary: #your-brand-color;
  --moto-pos-color-primary-hover: #your-brand-hover;
  --moto-pos-color-primary-light: #your-brand-light;
  
  /* Adjust spacing scale */
  --moto-pos-space-4: 1.5rem;
  
  /* Custom border radius */
  --moto-pos-radius-md: 0.75rem;
}
```

### Override via JavaScript/TypeScript

```tsx
import { createTokenStyles } from '@moto-pos/tokens'

// Generate custom CSS at runtime
const customTokens = {
  colors: {
    primary: '#your-brand-color',
    primaryHover: '#your-brand-hover',
    // ... only override what you need
  }
}

const customCSS = createTokenStyles(customTokens)
// Inject via style tag or CSS-in-JS solution
```

---

## Dark Mode

### Automatic (prefers-color-scheme)

Dark mode activates automatically based on system preference. The `:root:not(.light)` media query in `tokens.css` handles this.

### Class-based Toggle

Add `.dark` class to `<html>` or a parent element:

```tsx
// Toggle function
function toggleDarkMode() {
  document.documentElement.classList.toggle('dark')
}

// Or use a provider
function ThemeProvider({ children, defaultTheme = 'system' }) {
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>(defaultTheme)
  
  useEffect(() => {
    const root = document.documentElement
    if (theme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      root.classList.toggle('dark', prefersDark)
    } else {
      root.classList.toggle('dark', theme === 'dark')
    }
  }, [theme])
  
  return <>{children}</>
}
```

### Force Light Mode

Add `.light` class to override system preference:

```html
<html class="light">
  <!-- Always light -->
</html>
```

---

## Scoped Theming

Apply tokens to a specific subtree only:

```tsx
<div className="moto-pos" style={{ '--moto-pos-color-primary': '#custom-color' }}>
  <MotoChargePanel />
</div>
```

Or with a CSS class:

```css
.my-branded-pos {
  --moto-pos-color-primary: #custom-color;
  --moto-pos-color-primary-hover: #custom-hover;
}
```

```tsx
<div className="moto-pos my-branded-pos">
  <MotoChargePanel />
</div>
```

---

## Component Customization

All primitives use tokens internally. To customize a specific component:

```css
/* Custom Input styling */
.my-custom-input .moto-pos-input {
  border-width: 2px;
  font-size: var(--moto-pos-text-lg);
}

/* Custom Button variant */
.moto-pos-btn--brand {
  background-color: var(--moto-pos-color-accent);
  color: var(--moto-pos-color-text-inverse);
}
.moto-pos-btn--brand:hover {
  background-color: var(--moto-pos-color-accent-hover);
}
```

---

## Migration from Tailwind

If migrating from Tailwind, map common utilities:

| Tailwind | Moto POS Token |
|----------|----------------|
| `bg-primary` | `background: var(--moto-pos-color-primary)` |
| `text-primary` | `color: var(--moto-pos-color-primary)` |
| `border-primary` | `border-color: var(--moto-pos-color-primary)` |
| `focus:ring-primary` | `box-shadow: var(--moto-pos-shadow-focus)` |
| `rounded-md` | `border-radius: var(--moto-pos-radius-md)` |
| `p-4` | `padding: var(--moto-pos-space-4)` |
| `gap-4` | `gap: var(--moto-pos-space-4)` |

---

## Browser Support

CSS Custom Properties are supported in all modern browsers:
- Chrome 49+
- Firefox 31+
- Safari 9.1+
- Edge 16+

No polyfills needed for modern targets.