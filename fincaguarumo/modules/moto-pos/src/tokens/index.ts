export interface TokenConfig {
  colors: {
    primary: string
    primaryHover: string
    primaryLight: string
    secondary: string
    accent: string
    accentHover: string
    success: string
    successLight: string
    warning: string
    warningLight: string
    error: string
    errorLight: string
    background: string
    surface: string
    surfaceHover: string
    border: string
    borderFocus: string
    textPrimary: string
    textSecondary: string
    textMuted: string
    textInverse: string
    overlay: string
  }
  spacing: {
    1: string
    2: string
    3: string
    4: string
    5: string
    6: string
    8: string
    10: string
    12: string
  }
  radius: {
    sm: string
    md: string
    lg: string
    full: string
  }
  shadows: {
    sm: string
    md: string
    lg: string
    focus: string
  }
  transitions: {
    fast: string
    normal: string
  }
  typography: {
    fontSans: string
    fontMono: string
    textXs: string
    textSm: string
    textBase: string
    textLg: string
    textXl: string
    text2xl: string
    fontNormal: number
    fontMedium: number
    fontSemibold: number
    fontBold: number
  }
  zIndex: {
    dropdown: number
    modal: number
    toast: number
    tooltip: number
  }
}

export const defaultTokens: TokenConfig = {
  colors: {
    primary: '#034b25',
    primaryHover: '#023a1d',
    primaryLight: '#e8f5ee',
    secondary: '#18181b',
    accent: '#9d1f60',
    accentHover: '#7a184a',
    success: '#166534',
    successLight: '#dcfce7',
    warning: '#854d0e',
    warningLight: '#fef3c7',
    error: '#991b1b',
    errorLight: '#fee2e2',
    background: '#ffffff',
    surface: '#fafafa',
    surfaceHover: '#f4f4f5',
    border: '#e4e4e7',
    borderFocus: '#034b25',
    textPrimary: '#18181b',
    textSecondary: '#52525b',
    textMuted: '#a1a1aa',
    textInverse: '#ffffff',
    overlay: 'rgba(24, 24, 27, 0.5)',
  },
  spacing: {
    1: '0.25rem',
    2: '0.5rem',
    3: '0.75rem',
    4: '1rem',
    5: '1.25rem',
    6: '1.5rem',
    8: '2rem',
    10: '2.5rem',
    12: '3rem',
  },
  radius: {
    sm: '0.375rem',
    md: '0.5rem',
    lg: '0.75rem',
    full: '9999px',
  },
  shadows: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',
    focus: '0 0 0 3px #e8f5ee',
  },
  transitions: {
    fast: '150ms ease',
    normal: '200ms ease',
  },
  typography: {
    fontSans: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    fontMono: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace',
    textXs: '0.75rem',
    textSm: '0.875rem',
    textBase: '1rem',
    textLg: '1.125rem',
    textXl: '1.25rem',
    text2xl: '1.5rem',
    fontNormal: 400,
    fontMedium: 500,
    fontSemibold: 600,
    fontBold: 700,
  },
  zIndex: {
    dropdown: 100,
    modal: 200,
    toast: 300,
    tooltip: 400,
  },
}

export function createTokenStyles(tokens: Partial<TokenConfig> = {}): string {
  const merged = { ...defaultTokens, ...tokens }
  const cssVars: string[] = []

  Object.entries(merged.colors).forEach(([key, value]) => {
    cssVars.push(`--moto-pos-color-${kebabCase(key)}: ${value};`)
  })
  Object.entries(merged.spacing).forEach(([key, value]) => {
    cssVars.push(`--moto-pos-space-${key}: ${value};`)
  })
  Object.entries(merged.radius).forEach(([key, value]) => {
    cssVars.push(`--moto-pos-radius-${key}: ${value};`)
  })
  Object.entries(merged.shadows).forEach(([key, value]) => {
    cssVars.push(`--moto-pos-shadow-${key}: ${value};`)
  })
  Object.entries(merged.transitions).forEach(([key, value]) => {
    cssVars.push(`--moto-pos-transition-${key}: ${value};`)
  })
  Object.entries(merged.typography).forEach(([key, value]) => {
    cssVars.push(`--moto-pos-${kebabCase(key)}: ${value};`)
  })
  Object.entries(merged.zIndex).forEach(([key, value]) => {
    cssVars.push(`--moto-pos-z-${key}: ${value};`)
  })

  return `:root {\n  ${cssVars.join('\n  ')}\n}`
}

function kebabCase(str: string): string {
  return str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase()
}