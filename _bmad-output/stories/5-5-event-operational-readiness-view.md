# Story 5.5: Event Operational Readiness View

Status: complete

## Story

As an organizer,
I want to review whether my event is operationally ready,
so that I can confirm the event setup, ticket configuration, and staff access are in place before entry begins.

## Acceptance Criteria

1. Given an organizer has access to an event they manage, when they open the event readiness view, then the product presents a consolidated view of the event’s operational setup, and the organizer can review readiness without navigating through every configuration area separately.
2. Given the event has core setup elements such as event details, ticket types, resale policy, and staff assignments, when the organizer views readiness status, then the product reflects whether those setup areas are configured or incomplete, and the organizer can identify the next missing or incomplete setup area clearly.
3. Given the event is not yet fully prepared for live operation, when the organizer views the readiness screen, then the product highlights the incomplete areas that may affect event operations, and it helps the organizer understand what still needs attention before entry begins.
4. Given the event is sufficiently configured for launch and entry operations, when the organizer views readiness status, then the product communicates that the event is ready for the next operational stage, and the organizer can proceed with greater confidence in the setup.
5. Given underlying event, ticket, resale, or staff configuration changes, when the organizer opens or refreshes the readiness view, then the readiness information reflects the latest available event state, and outdated readiness conclusions are not presented as current truth.
6. Given the organizer uses the readiness view on mobile or desktop, when the screen is rendered, then the readiness summary and any incomplete-area indicators remain readable and actionable at supported breakpoints, and the view preserves clarity rather than turning into dashboard clutter.
7. Given the product cannot retrieve readiness information because of a temporary system or network issue, when the organizer opens the readiness view, then the product shows a clear failure or retry state, and it avoids implying that the event is ready or incomplete when current truth cannot be confirmed.

## Tasks / Subtasks

- [x] Extend organizer event detail typing for readiness signals. (AC: 1, 2, 5)
  - [x] Include event metrics in the frontend organizer event detail shape.
  - [x] Reuse current event detail data rather than introducing a separate readiness endpoint.

- [x] Add an organizer readiness panel. (AC: 1, 2, 3, 4, 6, 7)
  - [x] Summarize readiness across event details, ticket types, resale policy, and staff.
  - [x] Show completed vs incomplete setup areas with clear operational language.
  - [x] Highlight the next areas needing attention.

- [x] Keep readiness aligned with current backend truth. (AC: 5, 7)
  - [x] Derive readiness directly from the latest loaded event detail and staff data.
  - [x] Avoid separate stale client-side models of event readiness.

- [x] Verify the implementation. (AC: 1-7)
  - [x] Confirm lint passes.
  - [x] Confirm production build passes.

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Completion Notes List

- Added event metrics typing to the organizer event detail response.
- Added a readiness panel that summarizes operational state across core setup areas.
- Kept readiness derived from existing event detail and staff truth already loaded in the organizer workspace.

### File List

- [frontend/src/lib/organizer/events-client.ts](/Users/arnoldekechi/RiderProjects/ticketsystem/frontend/src/lib/organizer/events-client.ts)
- [frontend/src/features/organizer/event-management-panel.tsx](/Users/arnoldekechi/RiderProjects/ticketsystem/frontend/src/features/organizer/event-management-panel.tsx)

### Change Log

- Added organizer readiness typing and panel rendering.
- Added clear completed/incomplete readiness indicators and next-step guidance.
- Kept readiness synced to the same event detail payload used elsewhere in the organizer workspace.
