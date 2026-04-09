# Story 2.3: Post-Payment Ticket Issuance Confirmation

Status: complete

## Story

As an attendee,
I want to see that my tickets were issued immediately after successful payment,
so that I can trust that my purchase is complete and my ticket is now in my account.

## Acceptance Criteria

1. Given an attendee has a successfully paid order, when the backend issues tickets for that order, then the product shows a post-purchase confirmation state, and the attendee is informed that the purchased tickets are now associated with their account.
2. Given tickets have been issued from a successful order, when the attendee views the confirmation outcome, then the product displays enough ticket-related information to confirm what was purchased, and the attendee can proceed directly toward their owned-ticket experience.
3. Given an attendee has just completed a successful purchase, when they move from payment completion into ticket confirmation, then the transition reinforces that the purchase is complete, and the attendee is not left in doubt about whether ticket issuance happened.
4. Given ticket issuance has not yet completed even though payment succeeded, when the attendee views the post-payment state, then the product communicates that issuance is still being finalized, and it avoids incorrectly presenting the tickets as already available.
5. Given the attendee opens their account immediately after a successful purchase, when they view their owned tickets, then the newly issued tickets are visible without requiring unusual delay or manual troubleshooting, and the attendee can identify them as the tickets from the recent purchase.
6. Given the product encounters a temporary issue while reflecting newly issued tickets, when the attendee attempts to verify their purchase, then the product shows a clear recovery path such as refresh or retry, and it does not display contradictory order and ticket states.
7. Given the attendee is on a mobile device after purchase, when they view the ticket issuance confirmation, then the confirmation, recent purchase context, and route into owned tickets are readable and usable on a small screen, and the next appropriate action is visually clear.

## Tasks / Subtasks

- [x] Upgrade the checkout success experience into ticket issuance confirmation. (AC: 1, 2, 3, 4)
  - [x] Show issued ticket details when the paid order already includes tickets.
  - [x] Show a distinct issuance-pending state when payment succeeded but tickets are not yet visible.
  - [x] Keep the success page centered on backend order truth.

- [x] Carry recent paid-order context into the attendee surface. (AC: 2, 5)
  - [x] Preserve the recent order id in the route into `/tickets`.
  - [x] Read that order on the attendee surface and show the newly issued ticket serials there.
  - [x] Avoid implementing the full wallet list yet.

- [x] Keep the UI readable and retry-friendly on mobile. (AC: 6, 7)
  - [x] Provide a refresh path when order or ticket reflection is delayed.
  - [x] Make the issued-ticket summary and next step obvious on small screens.

- [x] Verify the implementation. (AC: 1-7)
  - [x] Confirm lint passes.
  - [x] Confirm production build passes.

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Completion Notes List

- Upgraded the success return page to display issued ticket details when available.
- Added an issuance-pending state for paid orders whose tickets are not yet reflected.
- Passed recent paid order context into the attendee surface.
- Added a recent purchase summary to the attendee surface without building the full wallet.

### File List

- `/Users/arnoldekechi/RiderProjects/ticketsystem/_bmad-output/stories/2-3-post-payment-ticket-issuance-confirmation.md`
- `/Users/arnoldekechi/RiderProjects/ticketsystem/frontend/src/lib/orders/orders-client.ts`
- `/Users/arnoldekechi/RiderProjects/ticketsystem/frontend/src/features/checkout/checkout-return-status.tsx`
- `/Users/arnoldekechi/RiderProjects/ticketsystem/frontend/src/features/checkout/recent-order-panel.tsx`
- `/Users/arnoldekechi/RiderProjects/ticketsystem/frontend/src/features/auth/attendee-gateway.tsx`
- `/Users/arnoldekechi/RiderProjects/ticketsystem/frontend/src/app/(attendee)/tickets/page.tsx`

### Change Log

- 2026-04-09: Implemented Story 2.3 by adding backend-driven ticket issuance confirmation to checkout success and carrying recent purchase context into the attendee surface.
