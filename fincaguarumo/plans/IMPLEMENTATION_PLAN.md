# GBP API Implementation Plan

## Phase 1: Infrastructure (No UI Changes) ✅ COMPLETE
- [x] Install `google-auth-library`
- [x] Create `src/lib/gbp/client.ts` with `getAccessToken()` and `fetchAllReviews()`
- [x] Create `src/app/api/gbp/locations/route.ts` (with 1-hour ISR caching)
- [x] Create `src/app/api/gbp/reviews/route.ts` (with 1-hour ISR caching + rate limiting)
- [x] Create `src/app/api/gbp/invitations/route.ts` (list & accept invitations)
- [x] Create `scripts/setup-gbp-access.ts` (one-command setup)
- [x] API endpoints functional (Business Profile API v1)
- [ ] **Manual step**: Primary owner claims & verifies location in GBP
- [ ] **Manual step**: Add service account as Manager in GBP
- [ ] **Manual step**: Accept invitation via `npx tsx scripts/setup-gbp-access.ts`
- [ ] Verify `/api/gbp/locations` returns location (after invitation accepted)
- [ ] Verify `/api/gbp/reviews?locationId=...` returns all reviews (after invitation accepted)

## Phase 2: ReviewsProvider + Parallel Run ✅ COMPLETE
- [x] Create `src/app/providers/ReviewsProvider.tsx`
- [x] Create `src/components/ReviewsTest.tsx` (test component)
- [x] Create `src/components/GBPReviewsComparison.tsx` (comparison UI)
- [x] Wrap existing review components with BOTH providers:
  - [x] `src/app/[locale]/(pages)/reviews/ClientPage.tsx`
  - [x] `src/app/[locale]/(pages)/villa-bruno/AccommodationClientPage.tsx`
  - [x] `src/components/HomeMap.tsx`
- [x] Compare Places API reviews (5) vs GBP API reviews (all) via `GBPReviewsComparison`
- [x] Verify data consistency

## Phase 3: Switch Review Components ✅ COMPLETE
- [x] Update each review component to use `useReviews()` instead of `usePlace().reviews`
- [x] Components migrated:
  - [x] `ReviewSummary` / rating display
  - [x] `LocationReviews` (renamed from `PlaceReviews`)
  - [x] `GuestLikesSummary` (no longer uses usePlace for reviews)
  - [x] `HomeMap` (uses LocationReviews)
  - [x] `AccommodationClientPage` (uses LocationReviews)
  - [x] `ClientPage` (reviews page uses LocationReviews)
- [x] Remove `reviews` from `PlaceDetails` type in `PlaceProvider`
- [x] Remove `reviews` field from Places API request in `PlaceProvider`
- [x] Update `CombinedProviders` to not wrap ReviewsProvider in PlaceProvider
- [x] Rename `PlaceReviews` to `LocationReviews`
- [x] Update all references to use `LocationReviews` component

## Phase 4: Cleanup ✅ COMPLETE
- [x] Removed `CombinedProviders.tsx` (unused wrapper)
- [x] `AccommodationClientPage` uses `ReviewsProvider` directly
- [x] `HomeMap` uses `PlaceProvider` for map (required)
- [x] `usePlace` was never used - only `PlaceProvider` needed for map
- [x] Run full test suite (lint + typecheck pass)

## Phase 5 (Optional): Webhooks
- [ ] Create Pub/Sub topic
- [ ] Register GBP notification subscription
- [ ] Create `/api/gbp/webhook/route.ts`
- [ ] Implement cache invalidation on webhook
- [ ] Test real-time updates