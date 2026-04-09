# Story 2.1: Ticket Selection and Checkout Start

Status: complete

## Story

As an attendee,
I want to select a ticket type and quantity and begin checkout,
so that I can start purchasing access to an event with clear pricing and availability.

## Acceptance Criteria

1. Given an event has one or more purchasable ticket types, when an attendee selects a ticket type from the public event page, then the product allows the attendee to choose a valid quantity within the event's purchase rules, and the attendee can clearly see the selected ticket type, quantity, and pricing context before continuing.
2. Given the attendee has selected a valid ticket type and quantity, when they choose to continue to checkout, then the product starts the checkout flow, and the attendee is taken to the next purchase step without losing the selected ticket details.
3. Given the attendee is not authenticated when they try to begin checkout, when the product requires identity-bound purchase access, then the attendee is prompted to register or sign in before proceeding, and the selected event and ticket context is preserved so they can continue checkout after authentication.
4. Given a selected ticket type is unavailable, restricted, or exceeds the allowed quantity, when the attendee attempts to continue, then the product blocks checkout start, and it displays a clear explanation of why the current selection cannot be purchased.
5. Given the attendee is reviewing their intended purchase, when the checkout entry step is shown, then the product displays enough summary information for the attendee to confirm they are buying the correct ticket selection, and the total price shown matches the selected quantity and ticket pricing.
6. Given the attendee begins checkout from a mobile device, when the checkout start flow is rendered, then the ticket selection summary and primary action remain readable and operable on a small screen, and the interface does not introduce unnecessary friction before payment begins.
7. Given the product cannot start checkout because of a recoverable system or network issue, when the attendee attempts to continue, then the product shows a clear failure state, and the attendee can retry without having to rebuild the entire ticket selection from scratch.

## Tasks / Subtasks

- [x] Add ticket-type selection controls to the public event page. (AC: 1, 4, 6)
  - [x] Let attendees choose a valid quantity for each purchasable ticket type.
  - [x] Block unavailable or out-of-policy ticket types from continuing into checkout.
  - [x] Keep the selection UI mobile-friendly and easy to scan.

- [x] Preserve ticket selection context when moving into checkout. (AC: 2, 3)
  - [x] Build a stable next-step route that includes event slug, ticket type, and quantity.
  - [x] Route unauthenticated users through the existing auth flow without losing that selection.
  - [x] Keep attendee-authenticated users on the attendee surface.

- [x] Build the checkout-start review step. (AC: 2, 5, 6)
  - [x] Load the selected event and ticket type from backend-backed data.
  - [x] Show ticket summary, quantity, unit price, and estimated total before payment handoff.
  - [x] Keep the step protected by attendee authentication.

- [x] Start checkout against the backend order flow. (AC: 2, 7)
  - [x] Call the backend checkout endpoint with the preserved selection.
  - [x] Redirect to the returned Stripe checkout URL when available.
  - [x] Show recoverable error messaging if checkout start fails.

- [x] Verify the story without pulling in later post-payment screens. (AC: 2, 7)
  - [x] Keep `/checkout/success` and `/checkout/cancel` out of this story.
  - [x] Confirm lint and production build still pass.

## Dev Notes

- This story follows the completed public event page and auth/session work in Stories 1.2 through 1.5.
- The selected event and ticket context should survive the jump from public event page to auth to attendee checkout start.
- Backend-driven checkout already exists, so this story can hand off into Stripe while leaving the frontend success/cancel return pages for Story 2.2.

### Technical Requirements

- Use the existing event detail mapping in [public-event.ts](/Users/arnoldekechi/RiderProjects/ticketsystem/frontend/src/features/events/public-event.ts) rather than introducing a duplicate event model.
- Keep the backend as the source of truth and start checkout through `POST /orders/checkout`.
- Reuse the current auth/session provider and protected attendee surface gate.

### Backend Contract Notes

- Checkout creation is available at `POST /orders/checkout` in [orders.controller.ts](/Users/arnoldekechi/RiderProjects/ticketsystem/src/orders/orders.controller.ts).
- The order response now includes:
  - `checkoutSessionId`
  - `checkoutUrl`
  - `paymentStatus`
  - `checkoutStatus`
  - `isAwaitingPaymentConfirmation`
- These fields are sufficient for starting Stripe checkout now and supporting Story 2.2 later.

### Architecture Compliance

- Public event browsing remains public; the authenticated checkout-start review lives on the attendee surface.
- The frontend should continue using route-group separation and the shared API layer.
- Keep the scope narrow: selection, context preservation, and payment handoff start.

### UX Compliance

- Ticket selection should stay low-friction and explicit about availability limits.
- The checkout-start screen should confirm exactly what the attendee is buying before they leave for payment.
- The flow must remain mobile-first and clear under normal event-purchase conditions.

### Testing Requirements

- At minimum for this story:
  - selection UI works for purchasable ticket types
  - invalid quantity or unavailable ticket types are blocked
  - auth redirect preserves checkout-start context
  - checkout-start page renders the correct selection summary
  - checkout handoff failures show a recoverable message
  - `npm run lint` passes
  - `npm run build` passes

### References

- [epics.md](/Users/arnoldekechi/RiderProjects/ticketsystem/_bmad-output/epics.md#Story-2.1:-Ticket-Selection-and-Checkout-Start)
- [frontend-architecture.md](/Users/arnoldekechi/RiderProjects/ticketsystem/_bmad-output/frontend-architecture.md)
- [ux-design-specification.md](/Users/arnoldekechi/RiderProjects/ticketsystem/_bmad-output/ux-design-specification.md)
- [orders.controller.ts](/Users/arnoldekechi/RiderProjects/ticketsystem/src/orders/orders.controller.ts)
- [order-response.dto.ts](/Users/arnoldekechi/RiderProjects/ticketsystem/src/orders/dto/order-response.dto.ts)

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- Loaded Story 2.1 from the epic breakdown
- Reviewed the public event page, auth flow, attendee gate, and order checkout backend contract
- Implemented interactive selection on the public event page and added the attendee checkout-start review route
- Wired checkout handoff to the backend order creation endpoint
- Verified frontend with `npm run lint` and `npm run build`

### Completion Notes List

- Added quantity-aware ticket selection controls to the public event page.
- Preserved event, ticket, and quantity context through auth and into the attendee checkout-start route.
- Added an attendee-protected checkout-start review screen with pricing summary.
- Started real checkout handoff through the backend `POST /orders/checkout` endpoint and Stripe checkout URL.
- Left `/checkout/success` and `/checkout/cancel` for the next Epic 2 story.

### File List

- `/Users/arnoldekechi/RiderProjects/ticketsystem/_bmad-output/stories/2-1-ticket-selection-and-checkout-start.md`
- `/Users/arnoldekechi/RiderProjects/ticketsystem/frontend/src/app/(attendee)/tickets/checkout/start/page.tsx`
- `/Users/arnoldekechi/RiderProjects/ticketsystem/frontend/src/app/(public)/events/[slug]/page.tsx`
- `/Users/arnoldekechi/RiderProjects/ticketsystem/frontend/src/features/checkout/checkout-start-cta.tsx`
- `/Users/arnoldekechi/RiderProjects/ticketsystem/frontend/src/features/checkout/checkout-start-review.tsx`
- `/Users/arnoldekechi/RiderProjects/ticketsystem/frontend/src/features/events/public-event.ts`
- `/Users/arnoldekechi/RiderProjects/ticketsystem/frontend/src/lib/orders/orders-client.ts`

### Change Log

- 2026-04-09: Implemented Story 2.1 by adding interactive ticket selection, checkout-start review, auth-preserved selection context, and backend checkout handoff.
