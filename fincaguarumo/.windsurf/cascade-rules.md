# Cascade Rules for Finca Guarumo

## Project Overview

This is a Next.js application for Finca Guarumo, a hospitality business with booking capabilities, internationalization, and AI-powered features.

## Tech Stack & Defaults

### Core Technologies

- **Framework**: Next.js latest with App Router
- **Language**: TypeScript latest
- **Database**: Supabase (PostgreSQL)
- **CMS**: Sanity latest
- **Payments**: Stripe
- **Styling**: Tailwind CSS latest
- **UI Components**: Radix UI + shadcn/ui patterns
- **State Management**: SWR for server state, React hooks for client state

### Key Libraries

- **Forms**: React Hook Form + Zod validation
- **Icons**: Lucide React
- **Internationalization**: next-intl
- **Maps**: @vis.gl/react-google-maps
- **AI**: @ai-sdk/mistral, @ai-sdk/perplexity
- **Email**: MailerSend

## Preferred Patterns

### React Patterns

- **Functional Components Only**: No class components
- **Custom Hooks**: Extract complex logic into custom hooks (use\* prefix)
- **Props Destructuring**: Always destructure props in function signature
- **Default Exports**: Use default exports for components
- **Named Exports**: Use named exports for utilities and hooks

```tsx
// ✅ Good
interface BookingFormProps {
  onSubmit: (data: BookingData) => void
  initialData?: Partial<BookingData>
}

export default function BookingForm({
  onSubmit,
  initialData,
}: BookingFormProps) {
  // Component logic
}

// ✅ Good for hooks
export function useBookingCalendar(date: Date) {
  // Hook logic
}
```

### TypeScript Patterns

- **Strict Typing**: All functions and components must have proper types
- **Interface over Type**: Prefer interfaces for object shapes
- **Utility Types**: Use built-in utility types (Partial, Pick, Omit)
- **No `any`**: Never use `any` type

### Tailwind Conventions

- **Mobile-First**: Always design mobile-first
- **Responsive Prefixes**: Use `sm:`, `md:`, `lg:`, `xl:` consistently
- **Component Variants**: Use class-variance-authority for component variants
- **Color scheme**: Respect the color scheme defined in globals.css's @theme, never use -white or -black (use -zinc- variants)
- **Custom Colors**: Define and use custom colors in globals.css's @theme
- **Spacing**: Use Tailwind spacing scale consistently

```tsx
// ✅ Good
;<div className="flex flex-col space-y-4 p-4 sm:p-6 lg:p-8">
  <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
    Booking Details
  </h2>
</div>

// ✅ Good for variants
const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
)
```

### File Organization

- **Components**: `src/components/` - Group by feature (booking/, better-chatbot/, etc.)
- **Hooks**: `src/hooks/` - Custom React hooks
- **Lib**: `src/lib/` - Utilities, helpers, configurations
- **Types**: `src/types/` - TypeScript type definitions
- **Styles**: Global styles in `src/app/styles/globals.css`

### API Patterns

- **Route Handlers**: Use Next.js App Router API routes in `src/app/api/`
- **Error Handling**: Consistent error responses with proper HTTP status codes
- **Validation**: Use Zod schemas for request/response validation
- **Supabase**: Use Supabase client for database operations

## Safety Rules

### Environment Variables

- **NEVER** modify environment variables directly
- **NEVER** expose environment variables in client-side code
- **ALWAYS** use `process.env.VAR_NAME` for server-side access
- **USE** Next.js built-in environment variable validation

### Commands Safety

- **NEVER** auto-run destructive commands (rm, mv, git reset --hard, etc.)
- **ALWAYS** ask for user confirmation before running potentially harmful commands
- **CHECK** current directory before running file operations
- **VERIFY** command parameters before execution

### Database Safety

- **NEVER** run destructive SQL without explicit confirmation
- **ALWAYS** use transactions for multi-table operations
- **BACKUP** important data before schema changes
- **TEST** migrations on staging first

## Code Quality Standards

### ESLint & Prettier

- **ESLint**: Follow Next.js recommended configuration
- **Prettier**: Use default configuration with 2-space indentation
- **Pre-commit**: Husky + lint-staged for code quality

### Testing

- **Type Checking**: Use `tsc --noEmit` for compile-time validation
- **Component Testing**: Test critical user flows
- **API Testing**: Test API endpoints with proper validation

### Performance

- **Images**: Use Next.js Image component with proper sizing
- **Code Splitting**: Leverage Next.js automatic code splitting
- **Caching**: Implement appropriate caching strategies
- **Bundle Size**: Monitor and optimize bundle size

## Internationalization

- **next-intl**: Use for all internationalization needs
- **Message Files**: Store translations in `src/messages/[locale].json`
- **Dynamic Content**: Use Sanity internationalization for CMS content
- **Date/Time**: Use date-fns for locale-aware formatting

## Deployment & CI/CD

- **Netlify**: Primary deployment platform
- **GitHub Actions**: For CI/CD pipelines
- **Type Checking**: Run ./github/workflows/type-check-pr.yml on PRs
- **Environment**: Separate staging and production environments

## Common Gotchas

### Next.js Specific

- **Client Components**: Add "use client" directive for interactive components
- **Server Actions**: Use proper async/await patterns
- **Metadata**: Use Next.js metadata API for SEO

### Supabase Specific

- **RLS**: Always use Row Level Security policies
- **Auth**: Implement proper authentication flows
- **Realtime**: Use Supabase realtime subscriptions carefully

### Sanity Specific

- **GROQ**: Use GROQ queries for data fetching
- **Portable Text**: Use @portabletext/react for rich text
- **Image Optimization**: Use Sanity image URL builder

## Development Workflow

1. **Feature Development**
   - Create feature branch from main
   - Implement changes following patterns above
   - Run type checking: `npm run lint` and `npx tsc --noEmit`
   - Test functionality

2. **Code Review**
   - Ensure all patterns are followed
   - Check TypeScript compliance
   - Verify safety rules are respected

3. **Deployment**
   - Merge to main triggers deployment
   - Monitor build and deployment status
   - Verify functionality in production

## Resources

- **Next.js Documentation**: https://nextjs.org/docs
- **Tailwind CSS**: https://tailwindcss.com/docs
- **Supabase Docs**: https://supabase.com/docs
- **Sanity Docs**: https://www.sanity.io/docs
- **Radix UI**: https://www.radix-ui.com/primitives/docs/overview/introduction
