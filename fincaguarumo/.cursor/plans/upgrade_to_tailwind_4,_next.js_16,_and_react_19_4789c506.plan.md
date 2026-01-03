---
name: Upgrade to Tailwind 4, Next.js 16, and React 19
overview: Comprehensive upgrade plan migrating from Tailwind CSS 3.4.18 to v4, Next.js 15.5.7 to 16, and React 18.3.1 to 19, including MVP+ enhancements to leverage new features like React Compiler, View Transitions, and Tailwind CSS 4's CSS-first configuration.
todos:
  - id: verify-requirements
    content: Verify Node.js >= 20.9 and create backup branch
    status: in_progress
  - id: upgrade-tailwind
    content: Run @tailwindcss/upgrade tool and migrate configuration to CSS-first format
    status: pending
    dependencies:
      - verify-requirements
  - id: migrate-tailwind-css
    content: Update globals.css with @import tailwindcss and migrate theme to @theme directive
    status: pending
    dependencies:
      - upgrade-tailwind
  - id: update-tailwind-deps
    content: Update Tailwind CSS packages and handle plugin compatibility
    status: pending
    dependencies:
      - upgrade-tailwind
  - id: test-tailwind
    content: Test all styles, animations, and dark mode after Tailwind upgrade
    status: pending
    dependencies:
      - migrate-tailwind-css
      - update-tailwind-deps
  - id: upgrade-react
    content: Update React and React DOM to v19, update TypeScript types
    status: pending
    dependencies:
      - verify-requirements
  - id: update-react-hooks
    content: Review and update useFormState → useActionState and other deprecated hooks
    status: pending
    dependencies:
      - upgrade-react
  - id: test-react-components
    content: Test all 62 client components for React 19 compatibility
    status: pending
    dependencies:
      - update-react-hooks
  - id: upgrade-nextjs
    content: Run @next/codemod upgrade and update Next.js to v16
    status: pending
    dependencies:
      - upgrade-react
  - id: update-nextjs-config
    content: Update next.config.mjs to remove experimental flags and update syntax
    status: pending
    dependencies:
      - upgrade-nextjs
  - id: verify-dependencies
    content: Verify all dependencies (next-intl, react-hook-form, Radix UI) support React 19/Next.js 16
    status: pending
    dependencies:
      - upgrade-nextjs
  - id: test-nextjs
    content: Test all routes, API endpoints, middleware, and integrations
    status: pending
    dependencies:
      - update-nextjs-config
      - verify-dependencies
  - id: enable-react-compiler
    content: Install and enable React Compiler in next.config.mjs
    status: pending
    dependencies:
      - upgrade-nextjs
  - id: enhance-view-transitions
    content: Enhance View Transitions implementation using React 19 features
    status: pending
    dependencies:
      - upgrade-react
      - upgrade-nextjs
  - id: refactor-useeffect
    content: Refactor components to use useEffectEvent hook where applicable
    status: pending
    dependencies:
      - upgrade-react
  - id: optimize-server-components
    content: Audit and optimize client/server component split
    status: pending
    dependencies:
      - upgrade-nextjs
  - id: integration-testing
    content: Perform comprehensive integration testing of all user flows
    status: pending
    dependencies:
      - test-tailwind
      - test-react-components
      - test-nextjs
---

# Upgrade to Tailwind 4, Next.js 16, and React 19

## Current State

- **Next.js**: 15.5.7 → 16.0.0+
- **React**: 18.3.1 → 19.0.0+
- **Tailwind CSS**: 3.4.18 → 4.0.0+
- **Node.js**: Requires 20.9+ for Next.js 16
- **TypeScript**: Requires 5+ for Next.js 16
- **Project uses**: 62 client components, shadcn/ui, Radix UI, next-intl, Sanity CMS

## Prerequisites

### 1. Verify System Requirements

- **Node.js**: Upgrade to 20.9+ if needed

  ```bash
  node --version  # Should be >= 20.9
  ```

- **TypeScript**: Already at 5.9.3 (✓ compatible)

### 2. Create Backup Branch

```bash
git checkout -b upgrade/tailwind-next-react-upgrade
git commit -am "Backup before upgrade"
```

---

## Phase 1: Upgrade to Tailwind CSS 4

### Step 1.1: Run Official Upgrade Tool

```bash
npx @tailwindcss/upgrade
```

This tool will:

- Update dependencies in `package.json`
- Migrate `tailwind.config.ts` to CSS-first format
- Update CSS imports in `src/app/styles/globals.css`

### Step 1.2: Manual Migration Tasks

#### Update [tailwind.config.ts](tailwind.config.ts)

Tailwind 4 uses CSS-first configuration. The config file will be simplified or moved to CSS:

- **Current**: JS-based config with `theme.extend`, `plugins`
- **New**: CSS-first with `@theme` and `@utility` directives

#### Update [src/app/styles/globals.css](src/app/styles/globals.css)

Replace Tailwind 3 directives:

```css
/* Old (v3) */
@tailwind base;
@tailwind components;
@tailwind utilities;

/* New (v4) */
@import "tailwindcss";
```

Move theme configuration to CSS:

```css
@theme {
  /* Font families */
  --font-family-heading: var(--font-heading), ...;
  --font-family-body: var(--font-body), ...;

  /* Colors from tailwind.config.ts */
  --color-border: hsl(var(--border));
  --color-primary: hsl(var(--primary));
  /* ... etc */

  /* Border radius */
  --radius-xl: calc(var(--radius) + 4px);
  --radius-lg: var(--radius);
  /* ... etc */
}
```

#### Handle Plugins

- **tailwindcss-animate**: May need alternative approach in v4
- **@tailwindcss/typography**: Update to v4-compatible version or use CSS-first approach

#### Update [postcss.config.mjs](postcss.config.mjs)

Tailwind 4 may not require PostCSS config changes, but verify:

```js
export default {
  plugins: {
    "postcss-import": {},
    tailwindcss: {},
  },
}
```

### Step 1.3: Update Dependencies

```bash
npm uninstall tailwindcss @tailwindcss/typography tailwindcss-animate
npm install tailwindcss@next @tailwindcss/typography@next
# tailwindcss-animate may need alternative or CSS-based solution
```

### Step 1.4: Test and Fix

- Check all components render correctly
- Verify custom utilities work
- Test dark mode styles
- Validate animations and transitions

---

## Phase 2: Upgrade to React 19

### Step 2.1: Update React Dependencies

```bash
npm install react@latest react-dom@latest
npm install --save-dev @types/react@latest @types/react-dom@latest
```

### Step 2.2: Review Breaking Changes

#### Update Hook Usage

- **`useFormState` → `useActionState`**: Search for usage in forms
- **`useFormStatus`**: Review additional keys (`data`, `method`, `action`)

#### Check for Deprecated Patterns

- Remove usage of deprecated React APIs
- Review context usage (React 19 improves context performance)

### Step 2.3: Update TypeScript Types

- React 19 types are stricter; fix type errors
- Update component prop types if needed
- Review `React.ReactNode` usage

### Step 2.4: Test Components

- Test all 62 client components
- Verify context providers work correctly
- Check form submissions
- Validate event handlers

---

## Phase 3: Upgrade to Next.js 16

### Step 3.1: Run Next.js Codemod

```bash
npx @next/codemod@canary upgrade latest
```

This will:

- Update `next.config.mjs` (remove `experimental` flags where stabilized)
- Update ESLint config (deprecates `next lint` in favor of ESLint CLI)
- Migrate Turbopack configuration

### Step 3.2: Update Dependencies

```bash
npm install next@latest
npm install --save-dev eslint-config-next@latest
```

### Step 3.3: Update [next.config.mjs](next.config.mjs)

#### Remove Experimental Flags (if stabilized)

```js
// Check if these are now stable:
// - optimizePackageImports (likely stable)
// - serverActions.allowedOrigins (may need new syntax)
// - taint (check if still experimental)
```

#### Update Configuration

- Review `serverActions.allowedOrigins` syntax
- Verify `optimizePackageImports` configuration
- Update image configuration if needed

### Step 3.4: Update TypeScript Config

Review [tsconfig.json](tsconfig.json):

- Ensure `target` is ES2017 or higher
- Verify module resolution settings

### Step 3.5: Check Dependency Compatibility

Verify these packages support React 19 and Next.js 16:

- `next-intl` (3.26.5) - Check for v3.27+ or v4
- `react-hook-form` (7.68.0) - May need update
- `@radix-ui/*` packages - Verify React 19 support
- `next-sanity` (9.12.3) - Check compatibility
- `@stripe/react-stripe-js` - Verify support

### Step 3.6: Update ESLint Usage

```bash
# Old (deprecated)
npm run lint  # Uses next lint

# New (Next.js 16)
npx eslint .
```

---

## Phase 4: MVP+ Feature Implementation

### 4.1: Enable React Compiler (Performance)

#### Install React Compiler

```bash
npm install -D babel-plugin-react-compiler
```

#### Update [next.config.mjs](next.config.mjs)

```js
const nextConfig = {
  reactCompiler: true,
  // ... rest of config
}
```

#### Benefits

- Automatic memoization (reduces need for `useMemo`, `useCallback`)
- Fewer unnecessary re-renders
- Cleaner component code

#### Verify in Components

- Review components using manual memoization
- Remove redundant `useMemo`/`useCallback` where compiler handles it
- Test performance improvements

### 4.2: Leverage Turbopack (Development)

#### Verify Turbopack Usage

Next.js 16 uses Turbopack by default. Verify it's working:

```bash
npm run dev  # Should use Turbopack automatically
```

#### Benefits

- 76% faster server startup
- 90%+ faster Fast Refresh
- Better development experience

### 4.3: Implement View Transitions (User Experience)

#### Review Existing Implementation

You already have View Transitions API in [src/app/styles/globals.css](src/app/styles/globals.css) (lines 18-61). Enhance it:

#### Add React View Transitions Hook

Check [src/components/useViewTransition.ts](src/components/useViewTransition.ts) and enhance:

```tsx
// Use React 19's improved view transitions support
import { startTransition } from "react"
import { useRouter } from "next/navigation"

export function useViewTransition() {
  const router = useRouter()

  return (href: string) => {
    // React 19 has better support for view transitions
    if (document.startViewTransition) {
      document.startViewTransition(() => {
        router.push(href)
      })
    } else {
      router.push(href)
    }
  }
}
```

#### Benefits

- Smoother page transitions
- Better UX without extra libraries
- Native browser API support

### 4.4: Use `useEffectEvent` Hook (Code Quality)

#### Identify Candidates

Search for components with complex `useEffect` dependencies:

- [src/app/providers/BookingProvider.tsx](src/app/providers/BookingProvider.tsx)
- Components with event handlers in effects

#### Refactor Example

```tsx
// Before
useEffect(() => {
  const handler = e => {
    // uses props/state
  }
  window.addEventListener("scroll", handler)
  return () => window.removeEventListener("scroll", handler)
}, [prop1, state1]) // Many dependencies

// After (React 19)
const onScroll = useEffectEvent(e => {
  // Uses latest props/state without dependencies
})
useEffect(() => {
  window.addEventListener("scroll", onScroll)
  return () => window.removeEventListener("scroll", onScroll)
}, []) // No dependencies needed
```

### 4.5: Enhance Server Components (Architecture)

#### Audit Client Component Usage

Review 62 client components - identify which can become Server Components:

- Components only using client for interactivity can split into Server/Client parts
- Reduce client bundle size

#### Benefits

- Smaller client bundles
- Better SEO
- Faster initial loads

### 4.6: Leverage Tailwind CSS 4 Features

#### Use CSS-First Configuration

Move theme to CSS for better DX:

- IntelliSense in CSS files
- Easier customization
- Better performance

#### Dynamic Utility Values

Use Tailwind 4's dynamic utilities where applicable:

```tsx
// New in v4 - any value directly in class name
<div className="px-[5.1px]">  // Can be px-5.1 in v4
```

---

## Testing Strategy

### Phase 1 Testing (Tailwind 4)

1. Visual regression: Compare before/after screenshots
2. Test all breakpoints and responsive styles
3. Verify dark mode functionality
4. Check animations and transitions
5. Test print styles if applicable

### Phase 2 Testing (React 19)

1. Test all interactive components
2. Verify form submissions
3. Check context providers
4. Test error boundaries
5. Validate event handlers

### Phase 3 Testing (Next.js 16)

1. Test all routes and navigation
2. Verify API routes
3. Check middleware functionality
4. Test image optimization
5. Validate internationalization (next-intl)
6. Test Sanity integration
7. Verify Stripe checkout

### Integration Testing

1. End-to-end user flows
2. Booking process
3. Payment flow
4. Contact forms
5. Multi-language navigation

---

## Rollback Plan

If issues occur:

```bash
git stash  # Save current changes
git checkout main  # Return to original
# Or revert specific commits
git revert <commit-hash>
```

---

## Post-Upgrade Tasks

1. **Update Documentation**: Document new patterns and features
2. **Performance Monitoring**: Measure improvements
3. **Team Training**: Share new features with team
4. **Dependency Audit**: `npm audit` and fix vulnerabilities
5. **Bundle Analysis**: Compare bundle sizes before/after

---

## Critical Files to Review

- [package.json](package.json) - All dependencies
- [tailwind.config.ts](tailwind.config.ts) - Tailwind config migration
- [next.config.mjs](next.config.mjs) - Next.js config updates
- [src/app/styles/globals.css](src/app/styles/globals.css) - CSS-first migration
- [src/app/[locale]/layout.tsx](src/app/[locale]/layout.tsx) - Layout component
- [tsconfig.json](tsconfig.json) - TypeScript config
- All 62 client components - React 19 compatibility

---

## Estimated Timeline

- **Phase 1 (Tailwind 4)**: 2-4 hours
- **Phase 2 (React 19)**: 1-2 hours
- **Phase 3 (Next.js 16)**: 2-3 hours
- **Phase 4 (MVP+)**: 4-6 hours
- **Testing**: 2-3 hours
- **Total**: 11-18 hours

---

## Notes

- Upgrade in phases to isolate issues
- Test thoroughly after each phase
- Keep dependencies updated throughout
- Document any workarounds needed
- Consider enabling React Compiler gradually (per-page/route)
