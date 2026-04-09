# Story 3.1: Owned Ticket List

Status: complete

## Story

As an attendee,
I want to view the tickets I currently own,
so that I can quickly find the ticket that matters and confirm what access I currently have.

## Acceptance Criteria

1. Given an authenticated attendee owns one or more tickets, when they open their ticket wallet or owned-ticket area, then the product displays a list of their currently owned tickets, and each ticket entry includes enough identifying information for the attendee to distinguish it from other owned tickets.
2. Given an attendee owns multiple tickets, when the owned-ticket list is shown, then the most relevant active ticket is easy to identify, and active or high-priority tickets are not buried behind less relevant entries.
3. Given an attendee views the owned-ticket list, when each ticket entry is rendered, then the ticket's current state is visible at a glance, and states such as active, transfer pending, resale listed, used, or unavailable are distinguishable without requiring the attendee to open each ticket first.
4. Given the attendee selects a ticket from the owned-ticket list, when they choose a specific ticket entry, then the product navigates them to that ticket's detail experience, and the selected ticket context is preserved correctly.
5. Given an attendee has no currently owned tickets, when they open the owned-ticket area, then the product displays a clear empty state, and the empty state does not imply that hidden or unavailable tickets are still active.
6. Given an attendee recently completed a successful purchase or ownership change, when they open or refresh the owned-ticket list, then the list reflects the latest owned-ticket state available from the system, and newly issued or newly transferred tickets appear without contradictory status information.
7. Given the attendee opens the owned-ticket list on a mobile device, when the wallet screen is rendered, then the ticket list is readable and easy to scan on a small screen, and the primary active ticket remains visually prominent.
8. Given the product cannot retrieve the owned-ticket list because of a temporary system or network issue, when the attendee opens the wallet area, then the product shows a clear loading failure or retry state, and the attendee is not shown misleading stale ownership information as current truth.

## Tasks / Subtasks

- [x] Add a frontend owned-ticket client for the authenticated attendee. (AC: 1, 6, 8)
  - [x] Add a list call for `GET /api/tickets/me/owned`.
  - [x] Add a detail call for `GET /api/tickets/me/owned/:serialNumber` so list navigation has a valid destination.

- [x] Replace the attendee placeholder with a real wallet list. (AC: 1, 2, 3, 5, 6, 7, 8)
  - [x] Render owned tickets with event, serial, and state-at-a-glance information.
  - [x] Keep the most relevant active ticket visually prominent.
  - [x] Show clear loading, empty, and retry-friendly error states.
  - [x] Preserve the recent-order panel from Story 2.3 above the wallet list.

- [x] Add ticket selection handoff into a detail route. (AC: 4)
  - [x] Link each owned ticket into an attendee-owned detail path.
  - [x] Add a minimal owned-ticket detail route so navigation does not dead-end before Story 3.2 expands it.

- [x] Verify the implementation. (AC: 1-8)
  - [x] Confirm lint passes.
  - [x] Confirm production build passes.

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Completion Notes List

- Added a frontend owned-ticket client for list and owned-detail retrieval.
- Replaced the attendee placeholder with a mobile-first owned-ticket wallet.
- Kept recent purchase confirmation visible while prioritizing active tickets in the wallet.
- Added a minimal owned-ticket detail route so ticket selection has a working destination ahead of Story 3.2.

### File List

- `/Users/arnoldekechi/RiderProjects/ticketsystem/_bmad-output/stories/3-1-owned-ticket-list.md`
- `/Users/arnoldekechi/RiderProjects/ticketsystem/frontend/src/lib/tickets/tickets-client.ts`
- `/Users/arnoldekechi/RiderProjects/ticketsystem/frontend/src/features/tickets/owned-ticket-list.tsx`
- `/Users/arnoldekechi/RiderProjects/ticketsystem/frontend/src/features/tickets/owned-ticket-detail.tsx`
- `/Users/arnoldekechi/RiderProjects/ticketsystem/frontend/src/app/(attendee)/tickets/[serialNumber]/page.tsx`
- `/Users/arnoldekechi/RiderProjects/ticketsystem/frontend/src/features/auth/attendee-gateway.tsx`

### Change Log

- 2026-04-09: Implemented Story 3.1 by replacing the attendee placeholder with a live owned-ticket wallet and adding a minimal owned-ticket detail route foundation.
