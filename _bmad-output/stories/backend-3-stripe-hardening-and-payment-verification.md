# Backend Story 3: Stripe Hardening and End-to-End Payment Verification

Status: implemented-awaiting-verification

## Story

As a backend maintainer,
I want the Stripe checkout and webhook flow to be hardened and operationally verifiable,
so that paid orders transition reliably, ticket issuance is trustworthy, and production payment failures are diagnosable instead of ambiguous.

## Acceptance Criteria

1. Given a Stripe checkout session is created for a pending order, when the backend returns the checkout response, then the response includes stable session identifiers and enough state for the frontend to route the buyer into success or cancel handling confidently.
2. Given Stripe sends `checkout.session.completed`, when the webhook is processed, then the backend marks the order paid exactly once and issues tickets exactly once even if the event is delivered more than once.
3. Given Stripe sends `checkout.session.expired` or the payment is otherwise abandoned, when the webhook is processed, then the backend transitions the pending order into an appropriate non-paid state without creating tickets.
4. Given a webhook cannot be fully processed because of invalid data or an internal failure, when the backend records the event, then the failure is stored in a diagnosable form for later reconciliation rather than disappearing into generic errors.
5. Given a frontend success or cancel route needs to confirm the current order state, when it requests the order after the Stripe redirect, then the backend exposes enough order/payment status truth for the frontend to show success, pending, or cancelled states without guessing.
6. Given webhook events arrive out of order, late, or more than once, when the backend processes them, then order state remains consistent and previously-paid orders are not re-issued or regressed.
7. Given the Stripe integration is verified end to end, when the documented test flow is run in local or Railway test mode, then the expected order state transitions and ticket issuance outcomes can be observed and confirmed.

## Implements

- FR14: Attendees can complete checkout and payment for ticket purchases.
- FR15: The product can confirm when an order has been successfully paid.
- FR16: The product can issue tickets to the purchasing attendee after successful payment.
- FR17: Attendees can receive immediate confirmation that purchased tickets are now associated with their account.
- FR49: The product can keep high-stakes ticket and order information reasonably fresh during active use.
- NFR5: Sensitive user and ticket data must be protected in transit and at rest.
- NFR8: Ticket state should remain authoritative and internally consistent across purchase, transfer, resale, and scan workflows.
- NFR20: The frontend must interoperate reliably with the deployed backend API as the system of record for ticket state.
- Backend assessment priority: Stripe production hardening and operational maturity.

## Tasks / Subtasks

- [x] Audit and tighten the checkout session creation contract. (AC: 1, 5)
  - [x] Verify the backend returns stable checkout fields needed by the frontend after redirect.
  - [x] Confirm success and cancel URLs match the current frontend route plan.
  - [x] Ensure order identifiers, checkout session identifiers, and payment status fields stay consistent across retries.

- [x] Harden webhook idempotency and state transitions. (AC: 2, 3, 6)
  - [x] Verify `checkout.session.completed` cannot issue duplicate tickets if replayed.
  - [x] Verify expired or abandoned sessions cannot incorrectly move an already-paid order backward.
  - [x] Make state transition rules explicit for pending, paid, and cancelled/expired outcomes.

- [x] Improve webhook failure visibility and reconciliation signals. (AC: 4, 7)
  - [x] Ensure processing failures persist enough structured context for later diagnosis.
  - [x] Record whether an event is duplicate, processed, or failed in a way support/admin tooling can use later.
  - [x] Document the expected operational checks for payment verification in Railway.

- [x] Validate frontend-facing post-checkout truth. (AC: 1, 5, 7)
  - [x] Confirm existing order endpoints expose enough payment truth for `/checkout/success` and `/checkout/cancel`.
  - [x] Add a narrowly scoped backend contract improvement if the frontend needs a clearer status signal.
  - [x] Keep backend truth authoritative rather than relying on Stripe redirect query params alone.

- [ ] Run end-to-end verification against the real integration path. (AC: 2, 3, 6, 7)
  - [ ] Verify a successful Stripe checkout path from order creation to webhook completion to ticket issuance.
  - [ ] Verify duplicate webhook delivery does not duplicate issuance.
  - [ ] Verify cancelled or expired checkout does not create tickets.
  - [ ] Capture the exact verification steps and any test-card or webhook-trigger commands used.

## Dev Notes

Current relevant files:

- [payments.service.ts](/Users/arnoldekechi/RiderProjects/ticketsystem/src/payments/payments.service.ts)
- [payments.controller.ts](/Users/arnoldekechi/RiderProjects/ticketsystem/src/payments/payments.controller.ts)
- [orders.service.ts](/Users/arnoldekechi/RiderProjects/ticketsystem/src/orders/orders.service.ts)
- [orders.controller.ts](/Users/arnoldekechi/RiderProjects/ticketsystem/src/orders/orders.controller.ts)
- [schema.prisma](/Users/arnoldekechi/RiderProjects/ticketsystem/prisma/schema.prisma)
- [railway-deployment-checklist.md](/Users/arnoldekechi/RiderProjects/ticketsystem/_bmad-output/railway-deployment-checklist.md)

Current strengths already present:

- Stripe Checkout session creation
- Webhook signature verification
- Webhook event persistence
- Duplicate-event short-circuit when already processed
- Order-paid transition
- Ticket issuance on successful checkout completion
- Expired checkout handling

Likely hardening targets:

- explicit order-state reconciliation after redirects
- stronger guarantees around replayed or out-of-order webhook delivery
- clearer recording of processing failures for support use
- documented Railway or local test-mode verification flow

Suggested verification matrix:

| Scenario | Expected outcome |
| --- | --- |
| Successful checkout | Order becomes `PAID`; tickets issued once |
| Duplicate completed webhook | No duplicate tickets; duplicate acknowledged |
| Expired checkout session | Order becomes cancelled/expired; no tickets issued |
| Redirect before webhook completion | Frontend sees pending/confirming state from backend truth |
| Invalid webhook signature | Request rejected; no state mutation |

Out of scope for this story:

- Full refund automation
- Payout reconciliation
- Admin dashboard for failed webhook recovery
- Changing payment provider strategy

## Source References

- [backend-assessment.md](/Users/arnoldekechi/RiderProjects/ticketsystem/_bmad-output/backend-assessment.md)
- [backend-2-reusable-event-role-authorization.md](/Users/arnoldekechi/RiderProjects/ticketsystem/_bmad-output/stories/backend-2-reusable-event-role-authorization.md)
- [epics.md](/Users/arnoldekechi/RiderProjects/ticketsystem/_bmad-output/epics.md)

## Handoff Notes

This story is about production confidence, not new payment product scope.

Once complete:

- the frontend can trust backend payment truth after Stripe redirects
- webhook replay and delayed delivery should be safer and easier to reason about
- failures should leave a supportable trail instead of opaque production ambiguity
- the project will have a documented payment verification flow that can be repeated locally and on Railway test mode

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- Extended Stripe checkout responses with `checkoutStatus` and `isAwaitingPaymentConfirmation`
- Added Stripe-side order reconciliation for `GET /orders/:id` so pending orders can resolve from provider truth after redirects
- Enriched stored webhook records with related `eventId` and more diagnosable `processingError` strings
- Kept webhook state transitions idempotent and non-regressive for paid vs expired sessions
- Verified backend compiles with `npm run typecheck`

### Completion Notes List

- Checkout creation now returns clearer provider state for frontend success/cancel flows.
- Order retrieval can reconcile pending Stripe orders without waiting solely on webhook timing.
- Post-checkout order responses now include `checkoutStatus` and `isAwaitingPaymentConfirmation`.
- Webhook records now attach related event context where it can be resolved from the referenced order.
- Webhook processing errors now retain event type and order context for diagnosis.
- Real Stripe end-to-end verification is still pending and should be run in Stripe test mode before calling this slice fully closed.

### File List

- `/Users/arnoldekechi/RiderProjects/ticketsystem/_bmad-output/stories/backend-3-stripe-hardening-and-payment-verification.md`
- `/Users/arnoldekechi/RiderProjects/ticketsystem/src/payments/payments.service.ts`
- `/Users/arnoldekechi/RiderProjects/ticketsystem/src/orders/orders.service.ts`
- `/Users/arnoldekechi/RiderProjects/ticketsystem/src/orders/dto/order-response.dto.ts`

### Change Log

- 2026-04-09: Hardened Stripe checkout state handling, webhook diagnostics, and post-redirect order reconciliation; live Stripe verification still pending.
