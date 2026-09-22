# Feature Spec: POS Standalone Moto POS Module

**Linear Key:** POS-standalone
**Branch:** `feat/POS-standalone`
**Status:** Draft
**Created:** 2025-08-18

---

## 1. Goals

Extract the MOTO (Mail Order / Telephone Order) POS functionality into a **standalone, reusable TypeScript module** (`modules/moto-pos/`) that:

1. **Core Engine** — Pure TS charge validation, idempotency, and Stripe PaymentIntent creation (`moto: true`)
2. **Auth Abstraction** — Pluggable `AuthProvider` interface (Supabase JWT default, but swappable)
3. **HTTP Contract** — Framework-agnostic `handleChargeRequest(req) → {status, body}` + Next.js route wrapper
4. **React UI** — Self-contained primitives + `MotoChargePanel` widget + `useCharge` hook + i18n string map
5. **Theming** — CSS custom property tokens (light/dark), zero external UI deps
6. **Integration Docs** — WordPress/React embed guide, `scripts/set-admin.ts` helper

---

## 2. Non-Goals (Explicitly Removed)

| Feature | Reason |
|---------|--------|
| Booking lookup / reservation resolution | Couples module to Supabase schema; consumers pass resolved `amount/currency` |
| Supabase DB (`users`, `bookings` tables) | Module must work without any database |
| MailerSend / email notifications | Out of scope for POS module |
| Sanity CMS integration | Unrelated to payment collection |
| Calendar sync, GBP, iCal, reviews | Domain-specific, not POS |

---

## 3. Module Contract

### 3.1 Public API Surface (`modules/moto-pos/index.ts`)

```ts
// Core types
export interface ChargeInput {
  amount: number           // positive integer cents
  currency: string         // ISO-4217, validated against allowlist
  paymentMethodId: string  // Stripe PM ID (VCC token)
  idempotencyKey: string   // caller-supplied, e.g. "booking-vcc:{id}:{amt}:{curr}"
  description?: string
  metadata?: Record<string, string>
}

export interface ChargeResult {
  paymentIntentId: string
  status: 'succeeded' | 'requires_action' | 'failed'
  clientSecret?: string    // only when requires_action
}

// Auth abstraction
export interface AuthUser {
  id: string
  email?: string
  isAdmin: boolean
}

export interface AuthProvider {
  verifyUser(req: Request): Promise<AuthUser>
  verifyAdmin(req: Request): Promise<AuthUser>
}

// Engine
export function createCharge(input: ChargeInput, stripe: Stripe): Promise<ChargeResult>

// HTTP handler (framework-agnostic)
export interface HttpRequestLike {
  method: string
  headers: Headers
  json(): Promise<any>
}
export interface HttpResponseLike {
  status: number
  body: any
}
export function handleChargeRequest(
  req: HttpRequestLike,
  opts: { stripe: Stripe; auth: AuthProvider; config: ModuleConfig }
): Promise<HttpResponseLike>

// Next.js wrapper
export function createNextRouteHandler(opts: { stripe: Stripe; auth: AuthProvider; config: ModuleConfig })

// React
export { MotoChargePanel, useCharge } from './react'
export { ModuleStrings, StringsProvider, useStrings } from './strings'
export { defaultTokens, type TokenConfig } from './tokens'
```

### 3.2 Configuration (`modules/moto-pos/config.ts`)

```ts
export interface ModuleConfig {
  maxAmountCents: number           // default 1_000_000 (10k)
  allowedCurrencies: string[]      // default ['usd','eur','gbp','crc']
  idempotencyPrefix: string        // default 'booking-vcc'
}
```

### 3.3 Environment Variables (`.env.example`)

```
STRIPE_API_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...  # optional, for webhook handling
# Auth provider specific:
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=...
SUPABASE_JWT_SECRET=...          # for JWT verification without DB call
```

---

## 4. Acceptance Criteria per Milestone

### M1 — Module Scaffold & Core Engine (TDD)

| ID | Criterion |
|----|-----------|
| M1a | `modules/moto-pos/{config,types,index,env.example}.ts` exist; `package.json` exports `main`, `module`, `types` |
| M1b | `AuthProvider` interface + `verifyAdmin` pure TS (no side effects); unit tests cover 401/403/500 paths |
| M1c | `createCharge` validates amount/currency, enforces idempotency key format, calls Stripe with `moto:true`; unit tests cover validation, idempotency collision, success/requires_action/failed |
| M1d | `npm test` passes all core tests; `npm run type-check` clean |

### M2 — Adapters & HTTP Contract

| ID | Criterion |
|----|-----------|
| M2a | `stripe-adapter.ts` exports `createMotoPaymentIntent` wrapper; tests mock Stripe |
| M2b | `supabase-auth.ts` implements `AuthProvider` using JWT + `app_metadata.role === 'admin'` (no DB call); falls back to DB only if JWT missing |
| M2c | `handleChargeRequest` returns `{status, body}` for 200/400/401/403/404/422/500; integration tests with `msw` |
| M2d | Next.js wrapper in `http/next.ts`; `docs/http-api.md` documents WordPress POST contract (headers, body, responses) |

### M3 — React UI + Styling + Integration

| ID | Criterion |
|----|-----------|
| M3a | Primitives: `Input`, `Button`, `Label`, `Select`, `StatusAlert`, `Card` in `react/primitives/`; styled via CSS tokens only |
| M3b | `MotoChargePanel` — manual entry form (amount, currency, PM token) + `useCharge` hook (mutation + toast); accessible (ARIA, keyboard) |
| M3c | `LoginPage` sample using Supabase auth provider (optional, gated by `NEXT_PUBLIC_ENABLE_LOGIN`) |
| M3d | `ModuleStrings` map + `StringsContext` for i18n; English default included |
| M3e | `docs/theming.md` — token list, dark mode, globals.css snippet |
| M3f | `docs/wp-react-integration.md` — embed guide; `scripts/set-admin.ts` promotes user to admin via Supabase |

### M4 — App Shrink + Dogfood + Ship

| ID | Criterion |
|----|-----------|
| M4a | App's `/api/pos/charge` route delegates to module's Next wrapper; `/admin/finance` page uses `MotoChargePanel` |
| M4b | Supabase DB calls (`bookings`, `users` tables) removed from branch; MailerSend imports removed; booking-lookup code deleted |
| M4c | Tests ported to module; `proxy.ts` guard updated; env vars consolidated; `scripts/` cleaned |
| M4d | `npm run type-check && npm run lint && npm test` all pass; PR opened with spec link + test plan |

---

## 5. Key Decisions

| Decision | Rationale |
|----------|-----------|
| **Idempotency key format**: `booking-vcc:{internalId}:{amount}:{currency}` | Prevents double-charge across payment methods; caller controls uniqueness |
| **Admin check via `app_metadata.role`** | Zero-DB JWT verification; matches Supabase best practice |
| **No DB in module** | Keeps module portable; consumer resolves booking → amount/currency |
| **2/hr SMTP note** | Documented in `docs/http-api.md` — WordPress may rate-limit; consumer handles queuing |
| **CSS tokens not Tailwind** | Zero-runtime, framework-agnostic; consumers opt into Tailwind if desired |
| **MOTO flag on PaymentIntent** | Required for VCC processing; Stripe mandates `payment_method_options.card.moto=true` |

---

## 6. Module Tree (Target)

```
modules/moto-pos/
├── package.json
├── tsconfig.json
├── env.example
├── src/
│   ├── index.ts              # public exports
│   ├── config.ts             # ModuleConfig, defaults
│   ├── types.ts              # ChargeInput, ChargeResult, AuthProvider, etc.
│   ├── core/
│   │   ├── createCharge.ts   # pure engine
│   │   └── validation.ts     # amount/currency/idempotency validators
│   ├── adapters/
│   │   ├── stripe-adapter.ts # createMotoPaymentIntent
│   │   └── supabase-auth.ts  # AuthProvider impl (JWT + app_metadata)
│   ├── http/
│   │   ├── handleChargeRequest.ts
│   │   └── next.ts           # Next.js route wrapper
│   ├── react/
│   │   ├── primitives/       # Input, Button, Label, Select, StatusAlert, Card
│   │   ├── MotoChargePanel.tsx
│   │   ├── useCharge.ts
│   │   ├── LoginPage.tsx     # optional sample
│   │   └── index.ts
│   ├── strings/
│   │   ├── ModuleStrings.ts
│   │   ├── StringsContext.tsx
│   │   └── index.ts
│   └── tokens/
│       ├── tokens.css        # :root + .dark tokens
│       └── index.ts          # TokenConfig type + defaults
├── tests/
│   ├── core/
│   ├── adapters/
│   ├── http/
│   └── react/
├── docs/
│   ├── http-api.md
│   ├── theming.md
│   └── wp-react-integration.md
└── scripts/
    └── set-admin.ts
```

---

## 7. Test Plan Summary

| Layer | Tool | Coverage Target |
|-------|------|-----------------|
| Core (validation, idempotency, createCharge) | Vitest | 100% branches |
| Stripe adapter (mocked) | Vitest + MSW | Happy + error paths |
| Supabase auth (JWT + fallback) | Vitest | 401/403/500 + admin true/false |
| HTTP handler | Vitest + MSW | All status codes + malformed bodies |
| React primitives | Vitest + Testing Library | Render, a11y, interactions |
| MotoChargePanel | Vitest + Testing Library | Form submit, loading, error, success |
| Integration (Next route) | Playwright | E2E charge flow |

---

## 8. Migration Checklist (App → Module)

- [ ] Create `modules/moto-pos/` with scaffold
- [ ] Port `createCharge` logic from `src/app/api/admin/finance/route.ts`
- [ ] Port `verifyAdminAuth` → `AuthProvider` + `supabase-auth.ts`
- [ ] Create `handleChargeRequest` + Next wrapper
- [ ] Build React primitives + `MotoChargePanel` + `useCharge`
- [ ] Add strings map + theming tokens
- [ ] Write docs
- [ ] Update app: `/api/pos/charge` → module wrapper; `/admin/finance` → `MotoChargePanel`
- [ ] Delete booking lookup, Supabase DB, MailerSend, booking-lookup code
- [ ] Run full test suite
- [ ] Open PR

---

## 9. References

- Stripe MOTO docs: https://stripe.com/docs/payments/moto
- Supabase JWT `app_metadata`: https://supabase.com/docs/guides/auth/auth-jwt#custom-claims
- WordPress REST API auth: https://developer.wordpress.org/rest-api/using-the-rest-api/authentication/