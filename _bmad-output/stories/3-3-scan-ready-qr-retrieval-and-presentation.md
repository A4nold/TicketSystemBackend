# Story 3.3: Scan-Ready QR Retrieval and Presentation

Status: complete

## Story

As an attendee,
I want to retrieve and display a scan-ready QR for my active ticket,
so that I can present it at entry with confidence and without confusion.

## Acceptance Criteria

1. Given an authenticated attendee is viewing an active ticket they currently own, when they request the ticket's QR, then the product retrieves a scan-ready QR representation for that ticket, and the QR is presented within the owned-ticket experience without forcing the attendee through unrelated steps.
2. Given the attendee is viewing a ticket that is active and valid for entry, when the QR view is displayed, then the ticket's readiness state and QR are visually clear together, and the attendee can immediately understand that this is the code to present at the door.
3. Given the attendee is viewing a ticket that is not currently eligible for normal entry presentation, when they attempt to access the QR view, then the product communicates the current limiting state clearly, and it does not present an entry-ready QR as though the ticket were normally usable.
4. Given the QR depends on current ticket ownership or state, when the attendee opens or refreshes the QR view, then the product reflects the latest available server-backed QR state, and old or invalidated ticket state is not presented as current truth.
5. Given the attendee opens the QR view on a mobile device in a live event context, when the QR screen is rendered, then the QR is large enough and clear enough to be scanned easily, and the ticket state and supporting context remain readable under typical event-entry conditions.
6. Given the attendee needs to return from the QR view to the broader ticket context, when they leave the QR presentation screen, then they can return to the ticket detail or wallet flow without losing context, and the navigation remains simple and predictable.
7. Given the product cannot retrieve or refresh the QR because of a temporary system or network issue, when the attendee attempts to open the QR view, then the product shows a clear unavailable or retry state, and it avoids implying that a valid scan-ready QR is available when current truth cannot be confirmed.

## Tasks / Subtasks

- [x] Add a frontend client for owned-ticket QR retrieval. (AC: 1, 4, 7)
  - [x] Add a call for `GET /api/me/tickets/:serialNumber/qr`.
  - [x] Keep the QR payload tied to the authenticated attendee session.

- [x] Add QR presentation to the owned-ticket detail experience. (AC: 1, 2, 5, 6)
  - [x] Add an explicit attendee action to request the QR.
  - [x] Render a real QR image from the backend signed token.
  - [x] Keep the QR presentation readable on mobile with clear back/refresh actions.

- [x] Gate QR availability by live ticket state. (AC: 3, 4)
  - [x] Only render an entry-ready QR for active ticket states.
  - [x] Show a clear limiting-state message for used, transfer-pending, resale-listed, or otherwise unavailable tickets.

- [x] Verify the implementation. (AC: 1-7)
  - [x] Confirm lint passes.
  - [x] Confirm production build passes.

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Completion Notes List

- Added an authenticated frontend client for owned-ticket QR retrieval.
- Added a mobile-first QR panel to the owned-ticket detail view using backend signed-token truth.
- Prevented limiting-state tickets from presenting a misleading entry-ready QR.
- Added refresh and retry paths for QR retrieval without leaving the owned-ticket experience.

### File List

- `/Users/arnoldekechi/RiderProjects/ticketsystem/_bmad-output/stories/3-3-scan-ready-qr-retrieval-and-presentation.md`
- `/Users/arnoldekechi/RiderProjects/ticketsystem/frontend/src/lib/tickets/tickets-client.ts`
- `/Users/arnoldekechi/RiderProjects/ticketsystem/frontend/src/features/tickets/ticket-qr-panel.tsx`
- `/Users/arnoldekechi/RiderProjects/ticketsystem/frontend/src/features/tickets/owned-ticket-detail.tsx`
- `/Users/arnoldekechi/RiderProjects/ticketsystem/frontend/package.json`
- `/Users/arnoldekechi/RiderProjects/ticketsystem/frontend/package-lock.json`

### Change Log

- 2026-04-09: Implemented Story 3.3 by adding backend-driven QR retrieval and scan-ready QR presentation to the owned-ticket detail experience.
