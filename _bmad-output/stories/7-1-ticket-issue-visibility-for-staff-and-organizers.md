# Story 7.1: Ticket Issue Visibility for Staff and Organizers

Status: complete

## Story

As organizer staff or scanner staff,
I want to understand why a ticket cannot currently be used,
so that I can respond to entry issues without relying on guesswork or informal explanations.

## Acceptance Criteria

1. Given a scanner or organizer is viewing a ticket-related issue during event operations, when the product presents the current ticket state, then it provides enough visibility to understand whether the issue is related to ownership, prior usage, transfer, resale, or another ticket-state condition, and the user can distinguish between those issue types without relying on vague status labels.
2. Given a ticket is not currently valid for normal entry, when the scanner or organizer views the ticket issue state, then the product communicates why the ticket cannot currently be used, and the explanation is clear enough to support an operational decision at the venue.
3. Given a scanner receives a non-valid scan outcome during live validation, when the result is shown, then the product exposes enough contextual meaning for the scanner to understand the nature of the problem, and the outcome remains readable and actionable under live entry conditions.
4. Given an organizer reviews a ticket issue outside the immediate scanner flow, when they open the relevant ticket or operational context, then the product presents enough current-state information to help them interpret the incident, and the organizer does not need to rely on hidden internal system knowledge to understand the issue.
5. Given a user without the necessary operational access attempts to view ticket issue details, when the product evaluates their permissions, then access to that operational visibility is restricted appropriately, and protected ticket information is not exposed beyond the user's role.
6. Given ticket issue visibility is used on a mobile device in a live event setting, when the issue state is rendered, then the explanation, current status, and next relevant context remain readable and understandable on a small screen, and the interface does not collapse into ambiguous or low-signal messaging.
7. Given the product cannot retrieve the current ticket issue context because of a temporary system or network issue, when the scanner or organizer attempts to view the issue, then the product shows a clear failure or retry state, and it does not imply a confirmed issue explanation when current truth cannot be retrieved.

## Tasks / Subtasks

- [x] Add an authorized backend path for operational ticket issue lookup. (AC: 1, 2, 4, 5, 7)
  - [x] Add an event-scoped ticket issue endpoint restricted to accepted organizer/scanner memberships.
  - [x] Reuse the detailed ticket response so current state, ownership, transfer, resale, and scan summary are available in one lookup.

- [x] Add a shared frontend ticket issue visibility panel. (AC: 1, 2, 6, 7)
  - [x] Support serial-number lookup for the selected event.
  - [x] Translate raw ticket state into clear issue explanations instead of vague labels.

- [x] Surface issue visibility in both scanner and organizer workflows. (AC: 3, 4, 5, 6)
  - [x] Add the panel to the scanner workspace so staff can inspect problematic tickets at the door.
  - [x] Add the panel to organizer event management so organizers can review a ticket issue outside the scan console.

- [x] Verify the implementation. (AC: 1-7)
  - [x] Confirm backend typecheck passes.
  - [x] Confirm frontend lint passes.
  - [x] Confirm frontend production build passes.

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Completion Notes List

- Added an event-scoped operational ticket lookup endpoint gated by accepted event membership roles.
- Built a shared ticket issue visibility panel for both scanner and organizer workflows.
- Kept the issue interpretation focused on current-state visibility, leaving deeper history and audit review for Story 7.2.

### File List

- [src/tickets/tickets.controller.ts](/Users/arnoldekechi/RiderProjects/ticketsystem/src/tickets/tickets.controller.ts)
- [src/tickets/tickets.service.ts](/Users/arnoldekechi/RiderProjects/ticketsystem/src/tickets/tickets.service.ts)
- [frontend/src/lib/operations/tickets-client.ts](/Users/arnoldekechi/RiderProjects/ticketsystem/frontend/src/lib/operations/tickets-client.ts)
- [frontend/src/features/operations/ticket-issue-visibility-panel.tsx](/Users/arnoldekechi/RiderProjects/ticketsystem/frontend/src/features/operations/ticket-issue-visibility-panel.tsx)
- [frontend/src/features/scanner/scanner-workspace.tsx](/Users/arnoldekechi/RiderProjects/ticketsystem/frontend/src/features/scanner/scanner-workspace.tsx)
- [frontend/src/features/organizer/event-management-panel.tsx](/Users/arnoldekechi/RiderProjects/ticketsystem/frontend/src/features/organizer/event-management-panel.tsx)

### Change Log

- Added a protected event-scoped ticket issue endpoint for operational staff.
- Added a shared issue lookup panel and mounted it in scanner and organizer surfaces.
- Mapped ticket state into direct operational explanations for venue use.
