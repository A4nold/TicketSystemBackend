# Story 7.2: Audit and Incident Review Context

Status: complete

## Story

As organizer staff or scanner staff,
I want to review important ticket-state and scan-related history,
so that I can understand what happened during an incident and make informed follow-up decisions.

## Acceptance Criteria

1. Given an organizer or authorized staff member is reviewing a ticket-related incident, when they open the incident or ticket context, then the product provides access to relevant ticket-state and scan-related history, and the user can understand that the history reflects important prior actions rather than only the current state.
2. Given a ticket has undergone important lifecycle changes such as purchase confirmation, transfer, resale, or scan usage, when the authorized user reviews the ticket history, then the product shows enough audit context to understand that those changes occurred, and the user can distinguish major state changes from one another clearly.
3. Given a ticket issue occurred at entry, when an organizer or staff member reviews the related context, then the product provides enough historical visibility to help explain the incident, and the user can connect the current problem to prior scan or ownership events where relevant.
4. Given scan-related activity exists for a ticket, when the authorized user reviews the audit context, then the product presents enough scan history to support operational understanding, and the history does not require the user to infer what happened from incomplete or ambiguous records.
5. Given a user without the required operational permissions attempts to access audit or incident history, when the product evaluates access, then the audit context is restricted appropriately, and protected ticket or scan history is not exposed beyond the user's role.
6. Given audit and incident review is used on a mobile device or larger screen, when the product presents the historical context, then the information remains readable and understandable at supported breakpoints, and the interface preserves clarity rather than overwhelming the user with low-priority detail.
7. Given the product cannot retrieve audit or incident history because of a temporary system or network issue, when the authorized user attempts to review it, then the product shows a clear failure or retry state, and it does not imply that the displayed historical context is complete when retrieval could not be confirmed.

## Tasks / Subtasks

- [x] Extend the operational ticket response with incident history. (AC: 1, 2, 3, 4, 5)
  - [x] Include scan attempts, transfer history, and resale history alongside ownership history.
  - [x] Preserve the event-scoped authorization model from Story 7.1.

- [x] Render audit and incident review in the shared operations panel. (AC: 1, 2, 3, 4, 6, 7)
  - [x] Add a unified incident timeline that mixes ownership, transfer, resale, and scan events.
  - [x] Keep the panel readable on mobile by limiting it to the most recent relevant events.

- [x] Verify the implementation. (AC: 1-7)
  - [x] Confirm backend typecheck passes.
  - [x] Confirm frontend lint passes.
  - [x] Confirm frontend production build passes.

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Completion Notes List

- Extended the event-scoped operational ticket response with transfer, resale, and scan-attempt history.
- Added a unified incident timeline to the shared operations panel for organizer and scanner use.
- Kept Story 7.2 layered on top of the protected operational lookup introduced in Story 7.1.

### File List

- [src/tickets/dto/ticket-response.dto.ts](/Users/arnoldekechi/RiderProjects/ticketsystem/src/tickets/dto/ticket-response.dto.ts)
- [src/tickets/tickets.service.ts](/Users/arnoldekechi/RiderProjects/ticketsystem/src/tickets/tickets.service.ts)
- [frontend/src/lib/operations/tickets-client.ts](/Users/arnoldekechi/RiderProjects/ticketsystem/frontend/src/lib/operations/tickets-client.ts)
- [frontend/src/features/operations/ticket-issue-visibility-panel.tsx](/Users/arnoldekechi/RiderProjects/ticketsystem/frontend/src/features/operations/ticket-issue-visibility-panel.tsx)

### Change Log

- Added historical scan, transfer, and resale context to the operational ticket detail.
- Added a unified incident timeline to the shared operations issue panel.
