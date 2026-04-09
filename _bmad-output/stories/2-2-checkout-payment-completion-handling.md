# Story 2.2: Checkout Payment Completion Handling

Status: complete

## Story

As an attendee,
I want the product to handle checkout completion clearly,
so that I know whether my payment succeeded, failed, or still needs confirmation before I expect tickets to appear.

## Acceptance Criteria

1. Given an attendee has started checkout for a valid ticket selection, when they complete the payment step successfully, then the product recognizes the successful checkout outcome, and it presents a clear success state that indicates the purchase has been accepted or is being confirmed.
2. Given an attendee completes payment and the backend confirms the order as paid, when the product receives the updated order state, then the attendee is informed that payment succeeded, and the product continues the attendee into the post-purchase ticket confirmation flow.
3. Given an attendee exits or returns from the payment step with an unsuccessful outcome, when the product evaluates the checkout result, then it displays a clear failure or incomplete-payment state, and the attendee is not misled into believing tickets were issued.
4. Given a payment outcome is still pending or awaiting backend confirmation, when the attendee returns from checkout, then the product displays a clear in-progress or pending-confirmation state, and it explains that ticket availability depends on final confirmation.
5. Given payment completion handling occurs after an external checkout handoff, when the attendee returns to the product, then the selected order context is recoverable, and the attendee can understand which purchase attempt the product is resolving.
6. Given the product cannot determine checkout completion because of a temporary system or network issue, when the attendee lands back in the app, then the product shows a clear retry or refresh path, and it avoids displaying contradictory payment or ticket states.
7. Given checkout completion is shown on a mobile device, when the attendee views the result, then the payment outcome, next action, and current order state are readable and actionable on a small screen, and the attendee is not forced through unrelated navigation before understanding the result.

## Tasks / Subtasks

- [x] Add frontend routes for Stripe return handling. (AC: 1, 3, 5)
  - [x] Create `/checkout/success`.
  - [x] Create `/checkout/cancel`.
  - [x] Preserve `orderId` context from Stripe redirect query params.

- [x] Add backend-driven order retrieval for checkout-return pages. (AC: 2, 4, 5, 6)
  - [x] Add a frontend order fetch helper for `GET /orders/:orderId`.
  - [x] Use the authenticated attendee session to fetch the authoritative order state.
  - [x] Treat backend order truth as the source of success, pending, and cancelled outcomes.

- [x] Build clear payment outcome states for mobile-first use. (AC: 1, 3, 4, 7)
  - [x] Show success when the backend says the order is paid.
  - [x] Show pending/confirming when the backend has not finalized the order yet.
  - [x] Show cancelled/incomplete messaging for the cancel return path.
  - [x] Show recoverable retry/refresh messaging when order lookup fails.

- [x] Keep the flow aligned to the next story. (AC: 2)
  - [x] Link forward into the attendee wallet or next confirmation step without over-implementing Story 2.3.
  - [x] Avoid duplicating the full post-purchase ticket confirmation experience here.

- [x] Verify the return handling flow. (AC: 5, 6, 7)
  - [x] Confirm lint passes.
  - [x] Confirm production build passes.

## Dev Notes

- Story 2.1 already starts checkout and sends the attendee to Stripe with backend-created order context.
- The backend now exposes `paymentStatus`, `checkoutStatus`, and `isAwaitingPaymentConfirmation` on order retrieval, which is the contract this story should use.
- These pages should not invent payment truth from Stripe query params alone.

### Technical Requirements

- Use the existing auth/session provider and keep checkout-return pages compatible with attendee session restoration.
- Use the backend `GET /orders/:orderId` endpoint as the sole source of checkout completion truth.
- Keep the implementation mobile-first and compatible with route-group structure.

### Backend Contract Notes

- `GET /orders/:orderId` returns:
  - `status`
  - `paymentStatus`
  - `checkoutStatus`
  - `isAwaitingPaymentConfirmation`
  - issued tickets when available
- Pending Stripe orders may reconcile on backend read, so the frontend should support refresh/retry.

### Architecture Compliance

- These return pages belong to the frontend Epic 2 checkout journey.
- The backend remains the authority for order and payment state.
- Do not expand into the full owned-ticket confirmation experience here; that belongs to Story 2.3.

### UX Compliance

- Success, pending, and cancel states must be unmistakable and readable on mobile.
- The attendee should immediately understand whether payment worked, is still confirming, or did not complete.
- The next action should be obvious without forcing unrelated navigation.

### Testing Requirements

- At minimum for this story:
  - success route loads order state by `orderId`
  - cancel route loads order state by `orderId`
  - pending state renders when the order is not yet paid
  - failed lookup shows retry guidance
  - `npm run lint` passes
  - `npm run build` passes

### References

- [epics.md](/Users/arnoldekechi/RiderProjects/ticketsystem/_bmad-output/epics.md#Story-2.2:-Checkout-Payment-Completion-Handling)
- [backend-3-stripe-hardening-and-payment-verification.md](/Users/arnoldekechi/RiderProjects/ticketsystem/_bmad-output/stories/backend-3-stripe-hardening-and-payment-verification.md)
- [orders.controller.ts](/Users/arnoldekechi/RiderProjects/ticketsystem/src/orders/orders.controller.ts)
- [order-response.dto.ts](/Users/arnoldekechi/RiderProjects/ticketsystem/src/orders/dto/order-response.dto.ts)

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- Loaded Story 2.2 from the epic breakdown
- Reviewed the backend order completion contract and existing checkout-start frontend
- Implemented frontend success and cancel return pages using backend-driven order lookup
- Verified frontend with `npm run lint` and `npm run build`

### Completion Notes List

- Added `/checkout/success` and `/checkout/cancel` as frontend return routes for Stripe checkout.
- Used authenticated backend order retrieval to determine success, pending, and cancelled outcomes.
- Added retry-friendly error messaging for indeterminate order lookup states.
- Kept the implementation focused on payment completion handling, leaving richer post-purchase confirmation for Story 2.3.

### File List

- `/Users/arnoldekechi/RiderProjects/ticketsystem/_bmad-output/stories/2-2-checkout-payment-completion-handling.md`
- `/Users/arnoldekechi/RiderProjects/ticketsystem/frontend/src/app/(public)/checkout/success/page.tsx`
- `/Users/arnoldekechi/RiderProjects/ticketsystem/frontend/src/app/(public)/checkout/cancel/page.tsx`
- `/Users/arnoldekechi/RiderProjects/ticketsystem/frontend/src/features/checkout/checkout-return-status.tsx`
- `/Users/arnoldekechi/RiderProjects/ticketsystem/frontend/src/lib/orders/orders-client.ts`

### Change Log

- 2026-04-09: Implemented Story 2.2 by adding frontend checkout completion routes and backend-driven order-state handling for success, cancel, and pending outcomes.
