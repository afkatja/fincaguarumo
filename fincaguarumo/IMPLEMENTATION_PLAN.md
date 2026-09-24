# GBP API Implementation Plan

## Phase 1: Infrastructure (No UI Changes) ✅ COMPLETE
- [x] Install `google-auth-library`
- [x] Create `src/lib/gbp/client.ts` with `getAccessToken()` and `fetchAllReviews()`
- [x] Create `src/app/api/gbp/locations/route.ts` (with 1-hour ISR caching)
- [x] Create `src/app/api/gbp/reviews/route.ts` (with 1-hour ISR caching + rate limiting)
- [ ] Verify `/api/gbp/locations` returns location (requires env vars)
- [ ] Verify `/api/gbp/reviews?locationId=...` returns all reviews (requires env vars)

## Phase 2: ReviewsProvider + Parallel Run
- [ ] Create `src/app/providers/ReviewsProvider.tsx`
- [ ] Wrap existing review components with BOTH providers
- [ ] Compare Places API reviews (5) vs GBP API reviews (all)
- [ ] Verify data consistency

## Phase 3: Switch Review Components
- [ ] Update each review component to use `useReviews()` instead of `usePlace().reviews`
- [ ] Components to migrate:
  - [ ] `ReviewsCarousel` / `ReviewList`
  - [ ] `ReviewSummary` / rating display
  - [ ] Any component showing review count
- [ ] Remove `reviews` from `PlaceDetails` type in `PlaceProvider`

## Phase 4: Cleanup
- [ ] Remove `reviews` field from Places API request in `PlaceProvider`
- [ ] Remove `reviews` from `PlaceDetails` type
- [ ] Update any remaining references
- [ ] Run full test suite

## Phase 5 (Optional): Webhooks
- [ ] Create Pub/Sub topic
- [ ] Register GBP notification subscription
- [ ] Create `/api/gbp/webhook/route.ts`
- [ ] Implement cache invalidation on webhook
- [ ] Test real-time updates