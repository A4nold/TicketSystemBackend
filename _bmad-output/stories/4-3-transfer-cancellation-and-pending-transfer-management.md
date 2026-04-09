# Story 4.3: Transfer Cancellation and Pending Transfer Management

Status: complete

## Story

As an attendee who started a transfer,
I want to cancel a pending transfer before it is accepted,
so that I can keep control of my ticket when plans change or a transfer link should no longer be usable.

## Acceptance Criteria

1. Given an authenticated attendee is viewing a ticket they currently own in a transfer-pending state, when that pending transfer is still eligible for cancellation, then the product presents transfer cancellation as an available action, and the attendee can cancel the pending transfer from the owned-ticket experience.
2. Given an attendee cancels a pending transfer successfully, when the cancellation completes, then the product reflects that the ticket is no longer transfer pending, and the ticket returns to its current owner in a normal owned state subject to event rules.
3. Given a pending transfer has already been accepted, expired, or otherwise become unavailable for cancellation, when the attendee attempts to cancel it, then the product blocks the cancellation action, and it provides a clear explanation of why the transfer can no longer be cancelled.
4. Given the sender cancels a pending transfer, when the recipient later opens the old acceptance link, then the product shows a clear unavailable or cancelled-transfer state, and it does not imply that the transfer can still be accepted.
5. Given the attendee views the ticket after cancellation, when the owned-ticket list or ticket detail is refreshed, then the product reflects the latest server-backed ticket state, and the attendee can distinguish that the transfer is no longer active.
6. Given the transfer cancellation flow is used on a mobile device, when the attendee reviews or confirms the cancellation, then the action, resulting state, and any blocking reason remain readable and usable on a small screen, and the attendee is not left uncertain about whether the transfer was cancelled successfully.
7. Given the product cannot complete cancellation because of a temporary system or network issue, when the attendee submits the cancellation request, then the product shows a clear failure or retry state, and it does not imply that transfer availability changed if the outcome cannot be confirmed.

## Tasks / Subtasks

- [x] Extend the transfers client for transfer cancellation. (AC: 1, 2, 3, 7)
  - [x] Add a cancel-transfer call for the current ticket owner.
  - [x] Normalize cancellation errors into recipient-safe and sender-safe messages.

- [x] Add transfer cancellation controls to ticket detail. (AC: 1, 2, 3, 6, 7)
  - [x] Show transfer cancellation only when the latest transfer is pending and owned by the current attendee.
  - [x] Add confirmation messaging that cancellation invalidates the acceptance link.
  - [x] Refresh ticket detail after cancellation to reflect backend truth.

- [x] Keep transfer acceptance links aligned with cancellation state. (AC: 3, 4, 5)
  - [x] Ensure the existing acceptance screen shows a clear cancelled/unavailable outcome after sender cancellation.
  - [x] Avoid implying the recipient can still accept a cancelled transfer.

- [x] Verify the implementation. (AC: 1-7)
  - [x] Confirm lint passes.
  - [x] Confirm production build passes.

## Dev Notes

- Build this before resale listing so the transfer lifecycle is complete end to end.
- Reuse the transfer state already surfaced in the ticket detail experience rather than creating a separate management screen.
- Keep backend truth authoritative; do not optimistically remove pending state until cancellation succeeds.

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Completion Notes List

- Added owner-side transfer cancellation support to the shared transfers client.
- Extended the existing ticket transfer panel to manage both transfer start and pending-transfer cancellation from ticket detail.
- Updated the recipient acceptance experience so cancelled transfer links show a more explicit unavailable state.

### File List

- [frontend/src/lib/transfers/transfers-client.ts](/Users/arnoldekechi/RiderProjects/ticketsystem/frontend/src/lib/transfers/transfers-client.ts)
- [frontend/src/features/tickets/ticket-transfer-panel.tsx](/Users/arnoldekechi/RiderProjects/ticketsystem/frontend/src/features/tickets/ticket-transfer-panel.tsx)
- [frontend/src/features/tickets/owned-ticket-detail.tsx](/Users/arnoldekechi/RiderProjects/ticketsystem/frontend/src/features/tickets/owned-ticket-detail.tsx)
- [frontend/src/features/transfers/transfer-acceptance-screen.tsx](/Users/arnoldekechi/RiderProjects/ticketsystem/frontend/src/features/transfers/transfer-acceptance-screen.tsx)

### Change Log

- Added transfer cancellation API wiring and sender-side pending transfer management.
- Added explicit cancellation messaging that invalidates prior acceptance links.
- Tightened recipient acceptance-state messaging for cancelled and unavailable transfers.
