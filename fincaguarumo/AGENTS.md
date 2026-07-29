# AGENTS instructions for this repo

## Architectural principles

- Follow the spec → plan → tests → implement → review → simplify → ship flow for new features.
- Treat `./feature-specs/<id>-<slug>.md` as the primary behavioral contract for features.
- Do not introduce new frameworks or major dependencies without an explicit spec update.

## Linear intake

- Treat Linear as the source of incoming work; treat `./feature-specs/<id>-<slug>.md` as the source of truth for implementation.
- For any Linear issue that requires code changes:
  - Fetch the issue details (title, description, acceptance criteria, comments).
  - Create or update a feature spec at `./feature-specs/<linear-key>-<slug>.md`.
  - Preserve the Linear key in the spec filename and frontmatter.

## Branch and PR conventions

- Branch names should follow the Conventional Commits specification and include the Linear key and slug, e.g.:
  - `feat/FG-123-improve-booking-widget`
  - `fix/FG-456-fix-checkout-timeout`
- Commit messages for feature work should:
  - Follow conventional commits format (feat, fix, chore, etc.)
  - Reference the Linear key in the subject line.
  - Briefly describe the change, e.g. `feat: FG-123: add loading skeleton to booking widget`.
- Pull request titles should start with the Linear key, e.g.:
  - `FG-123: Improve booking widget performance`
- Every PR description should:
  - Link to the Linear issue.
  - Paste or summarize the current feature spec.
  - Include test plan and outcomes (what was run, what passed).

## Linear → spec → workflow

- For Linear issues that require implementation:
  - First: convert the Linear issue into or update `./feature-specs/<key>-<slug>.md`.
  - Then: run the `/feature` workflow (or `@user-story-to-spec`, `@planner`, `@spec-to-tests`, `@implementer`, `@debugger`, `@review`, `@code-simplify`, `@ship`) using that spec as the primary contract.
- Do not start implementation from a Linear issue alone without a corresponding spec file.

## Testing

- Prefer TDD: derive tests from the feature spec before implementation.
- Never delete or weaken tests without clearly documenting why in the spec and commit message.

## Styleguide

### Color System

**Primary Colors:**

- `--guarumo-primary`: `#034b25` (deep green) - primary brand color
- `--guarumo-secondary`: `#18181b` (dark gray) - secondary text/background
- `--guarumo-accent`: `#9d1f60` (magenta) - accent/highlight color
- `--sunrise-color`: `#f9f2d8` (warm cream) - background accent

**Semantic Colors (Tailwind):**

- `text-primary`: Main text color (uses `--foreground`)
- `text-secondary`: Secondary text (uses `--secondary-foreground`)
- `text-muted`: Muted text (uses `--muted-foreground`)
- `text-destructive`: Error/danger text
- `bg-primary`: Primary backgrounds (uses `--primary`)
- `bg-secondary`: Secondary backgrounds (uses `--secondary`)
- `bg-card`: Card backgrounds (uses `--card`)
- `bg-muted`: Muted backgrounds (uses `--muted`)
- `bg-accent`: Accent backgrounds (uses `--accent`)
- `border-input`: Input borders (uses `--input`)
- `border-border`: General borders (uses `--border`)

NEVER use white or black; use gray variants (gray-100 for "white" and gray-900 for "black")

**Dark Mode Support:**

- All colors automatically adapt to dark mode via CSS variables
- Dark mode uses `guarumo-sky` (`#082f49`) and `guarumo-sunset` (`#b45309`) gradients
- always add dark mode variants to components

### Component Guidelines

**Before creating new components:**

1. **Search existing components first** - Check `src/components/ui/` for base components (Button, Card, Input, etc.)
2. **Check `src/components/`** for domain-specific components (BookingCalendar, HeaderBookButton, etc.)
3. **Only create new components** when existing ones don't meet requirements

**Available Base Components:**

- `Button` - with variants: default, destructive, outline, secondary, ghost, link
- `Card` - with CardHeader, CardTitle, CardDescription, CardContent, CardFooter
- `Input` - form inputs with validation
- `Label` - form labels
- `Select`, `DropdownMenu` - selection components
- `Dialog`, `Sheet` - modal/overlay components
- `Calendar`, `DatePicker` - date selection
- `Badge`, `Avatar` - UI elements
- `Separator` - visual dividers

**Styling Patterns:**

- Use `cn()` utility for conditional classes
- Follow the existing hover states: `hover:translate-y-[-2px] hover:shadow-md`
- Use semantic color variables instead of hard-coded colors
- Maintain consistent spacing with Tailwind's spacing scale
- Use `ring-*` classes for focus states
- Apply `disabled:opacity-50 disabled:pointer-events-none` for disabled states

**Typography:**

- Headings: Use `font-heading` CSS variable
- Body text: Use `font-body` CSS variable
- Text colors: Prefer semantic classes like `text-primary`, `text-muted-foreground`

### Implementation Checklist

When creating new components:

- [ ] Searched existing UI components in `src/components/ui/`
- [ ] Searched domain components in `src/components/`
- [ ] Used semantic color variables from CSS custom properties
- [ ] Applied consistent hover and focus states
- [ ] Added proper TypeScript interfaces
- [ ] Used `cn()` utility for conditional styling
- [ ] Followed existing component patterns and naming conventions

## Skills and workflows

- For new feature work, prefer:
  - `/feature` workflow
  - `@user-story-to-spec`, `@planner`, `@spec-to-tests`, `@implementer`, `@debugger`, `@review`, `@code-simplify`, `@ship`.
