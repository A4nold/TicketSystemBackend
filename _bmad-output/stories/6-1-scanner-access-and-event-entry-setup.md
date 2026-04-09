# Story 6.1: Scanner Access and Event Entry Setup

Status: complete

## Story

As scanner staff,
I want to access the scanner area for an assigned event and load the event validation context,
so that I can begin ticket scanning with the correct event data and permissions.

## Acceptance Criteria

1. Given an authenticated user has scanner-authorized access for a specific event, when they enter the scanner area, then the product directs them to the scanner experience for that event, and the product reflects that they are operating within the correct event context.
2. Given scanner staff have access to one or more assigned events, when they open the scanner entry flow, then the product allows them to enter the correct event scanning context, and the selected event is clearly identified before live validation begins.
3. Given the scanner experience requires event-specific validation data, when scanner staff open the event scanning area, then the product retrieves the event-specific scanning context needed for validation, and the scanner user is informed when the scanning context is ready to use.
4. Given a user lacks valid scanner authorization for an event, when they attempt to access that event's scanner flow, then the product blocks access, and it presents a clear unauthorized or unavailable outcome without exposing scanner-only functionality.
5. Given scanner staff open the scanner flow on a mobile device in a live-event setting, when the scanning area is rendered, then the entry setup and event context are readable and operable on a small screen, and the interface prioritizes speed and clarity over nonessential detail.
6. Given the product cannot load the scanner event context because of a temporary system or network issue, when scanner staff try to enter the scanner area, then the product shows a clear loading failure or retry state, and the user is not misled into believing validation is ready when required context is missing.
7. Given scanner access is established successfully, when the setup state completes, then the product presents a clear path into live ticket validation, and the scanner user does not need to navigate through unrelated screens before scanning begins.

## Tasks / Subtasks

- [x] Replace the scanner placeholder with an event-aware scanner workspace. (AC: 1, 2, 4, 5)
  - [x] Keep scanner access behind the existing role-aware surface gate.
  - [x] Show assigned events derived from accepted scanner-capable memberships.

- [x] Add scanner entry data access. (AC: 2, 3, 6)
  - [x] Add a scanner client for public event summaries and authenticated manifest retrieval.
  - [x] Load the selected event manifest from the backend and reflect loading and failure states clearly.

- [x] Present scanner readiness and next-step context. (AC: 1, 3, 5, 7)
  - [x] Show the selected event, role context, and manifest readiness summary.
  - [x] Make it clear that live validation attaches to this setup in Story 6.2.

- [x] Verify the implementation. (AC: 1-7)
  - [x] Confirm lint passes.
  - [x] Confirm production build passes.

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Completion Notes List

- Replaced the scanner placeholder route with a real event-selection and manifest-readiness workspace.
- Derived accessible scanner events from accepted event memberships and public event summaries.
- Loaded the scanner manifest as backend truth so event setup is ready for live validation in the next story.

### File List

- [frontend/src/app/(scanner)/scanner/page.tsx](/Users/arnoldekechi/RiderProjects/ticketsystem/frontend/src/app/(scanner)/scanner/page.tsx)
- [frontend/src/features/scanner/scanner-workspace.tsx](/Users/arnoldekechi/RiderProjects/ticketsystem/frontend/src/features/scanner/scanner-workspace.tsx)
- [frontend/src/lib/scanner/scanner-client.ts](/Users/arnoldekechi/RiderProjects/ticketsystem/frontend/src/lib/scanner/scanner-client.ts)

### Change Log

- Added a scanner workspace that selects assigned events and loads manifest readiness.
- Added scanner-specific client helpers for event summaries and manifest retrieval.
- Connected Story 6.1 to the existing protected scanner route without jumping ahead to validation logic.
