# Story 3.2: Ticket Detail and Live Ticket State

Status: complete

## Story

As an attendee,
I want to open a ticket and clearly understand its current status,
so that I can know whether it is valid, usable, or affected by transfer, resale, or prior usage.

## Acceptance Criteria

1. Given an authenticated attendee selects a ticket they currently own, when the ticket detail page opens, then the product displays the ticket's identifying details, event context, and current ticket state, and the attendee can understand what ticket they are viewing without ambiguity.
2. Given the attendee is viewing a currently valid ticket, when the ticket detail is shown, then the product presents the ticket as active and ready for entry, and the state language reinforces confidence rather than forcing interpretation.
3. Given the attendee is viewing a ticket affected by transfer, resale, prior use, or another limiting condition, when the ticket detail is shown, then the product displays the current limiting state clearly, and it explains enough context for the attendee to understand why the ticket is not in a normal active state.
4. Given the ticket's ownership or lifecycle state changes because of a purchase, transfer, resale, or scan event, when the attendee opens or refreshes the ticket detail view, then the product reflects the latest available server-backed state, and outdated state is not presented as though it were current truth.
5. Given the attendee opens a ticket they do not currently own or cannot access, when the product evaluates the request, then the product blocks access to that ticket detail, and it returns a clear not-found or unavailable outcome without exposing another user's ticket information.
6. Given the attendee is viewing ticket detail on a mobile device, when the page renders, then the ticket state, event information, and next relevant action are readable without excessive scrolling or visual clutter, and the ticket's status remains more visually prominent than secondary metadata.
7. Given the product cannot retrieve the latest ticket detail because of a temporary system or network issue, when the attendee opens the ticket, then the product shows a clear loading, retry, or unavailable state, and it avoids creating false confidence about ticket validity.

## Tasks / Subtasks

- [x] Expand the owned-ticket detail view into a real live-state experience. (AC: 1, 2, 3, 6)
  - [x] Make the current ticket state the dominant element on the page.
  - [x] Show event context, serial, ticket type, and ownership-relevant identifiers clearly.
  - [x] Add state-aware explanation copy for active, transfer-pending, resale-listed, used, and unavailable tickets.

- [x] Keep the detail view server-backed and refreshable. (AC: 4, 7)
  - [x] Use the backend owned-ticket detail endpoint as the source of truth.
  - [x] Add a refresh action for live-state updates.
  - [x] Keep loading and retry states explicit.

- [x] Preserve safe access handling. (AC: 5)
  - [x] Continue using the owned-ticket endpoint so non-owned tickets stay inaccessible.
  - [x] Show a generic unavailable state without leaking protected ticket data.

- [x] Verify the implementation. (AC: 1-7)
  - [x] Confirm lint passes.
  - [x] Confirm production build passes.

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Completion Notes List

- Expanded the owned-ticket detail route into a live-state detail experience.
- Added state-specific explanation copy and operational context for transfer, resale, and used tickets.
- Added refreshable backend-driven detail rendering with explicit loading and failure states.
- Kept QR presentation intentionally deferred to Story 3.3.

### File List

- `/Users/arnoldekechi/RiderProjects/ticketsystem/_bmad-output/stories/3-2-ticket-detail-and-live-ticket-state.md`
- `/Users/arnoldekechi/RiderProjects/ticketsystem/frontend/src/features/tickets/owned-ticket-detail.tsx`

### Change Log

- 2026-04-09: Implemented Story 3.2 by expanding the owned-ticket route into a real live-state detail experience with refresh, status explanations, and ownership context.
