# Story 5.2: Organizer Event Editing and Ticket Type Management

Status: complete

## Story

As an organizer,
I want to edit event details and manage ticket types,
so that I can control how the event is presented and sold after creation.

## Acceptance Criteria

1. Given an organizer has access to an event they manage, when they open the event management area, then the product allows them to view and edit the event’s core details, and the current event information is shown clearly enough to support confident updates.
2. Given the organizer submits valid changes to an event, when the event update is processed successfully, then the product saves the updated event details, and the organizer receives clear confirmation that the event was updated.
3. Given the organizer needs to define how tickets are sold for an event, when they open ticket-type management, then the product allows them to create ticket types for that event, and each ticket type can include the relevant sale information needed for attendee purchase.
4. Given one or more ticket types already exist for an event, when the organizer views ticket-type management, then the product displays the configured ticket types, and the organizer can update ticket-type details, pricing, and availability-related information.
5. Given the organizer submits invalid event or ticket-type changes, when the product validates the update, then the organizer receives clear feedback about what must be corrected, and invalid changes are not presented as successfully saved.
6. Given a user without organizer access attempts to edit event details or ticket types, when the product evaluates access to those controls, then the management actions are blocked, and the product returns a clear unauthorized-access outcome without exposing protected editing functionality.
7. Given the organizer is using the event and ticket-type management flow on mobile or desktop, when the management interface is rendered, then the workflow remains usable at supported breakpoints, and the product preserves operational clarity instead of collapsing into generic dashboard clutter.
8. Given the product cannot save event or ticket-type changes because of a temporary system or network issue, when the organizer attempts to submit the update, then the product shows a clear failure or retry state, and it avoids leaving the organizer uncertain about whether the change actually took effect.

## Tasks / Subtasks

- [x] Extend organizer event client support. (AC: 1, 2, 3, 4, 8)
  - [x] Add list, detail, update, create-ticket-type, and update-ticket-type client calls.
  - [x] Reuse organizer memberships from the auth session to determine which events are manageable.

- [x] Add organizer event detail editing flow. (AC: 1, 2, 5, 6, 7, 8)
  - [x] Show organizer-manageable events on the organizer surface.
  - [x] Add editable event fields for title, slug, venue, timing, status, and resale controls.
  - [x] Save event changes back to backend truth with success and error states.

- [x] Add ticket-type management flow. (AC: 3, 4, 5, 7, 8)
  - [x] Show existing ticket types for the selected event.
  - [x] Support creating a new ticket type from the organizer surface.
  - [x] Support updating an existing ticket type from the same surface.

- [x] Verify the implementation. (AC: 1-8)
  - [x] Confirm lint passes.
  - [x] Confirm production build passes.

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Completion Notes List

- Added organizer-side event listing and detail loading using membership-filtered events.
- Added event editing for core event configuration and resale controls.
- Added ticket-type creation and update management within the organizer workspace.

### File List

- [frontend/src/lib/organizer/events-client.ts](/Users/arnoldekechi/RiderProjects/ticketsystem/frontend/src/lib/organizer/events-client.ts)
- [frontend/src/features/organizer/event-creation-form.tsx](/Users/arnoldekechi/RiderProjects/ticketsystem/frontend/src/features/organizer/event-creation-form.tsx)
- [frontend/src/features/organizer/event-management-panel.tsx](/Users/arnoldekechi/RiderProjects/ticketsystem/frontend/src/features/organizer/event-management-panel.tsx)
- [frontend/src/features/organizer/organizer-workspace.tsx](/Users/arnoldekechi/RiderProjects/ticketsystem/frontend/src/features/organizer/organizer-workspace.tsx)
- [frontend/src/app/(organizer)/organizer/page.tsx](/Users/arnoldekechi/RiderProjects/ticketsystem/frontend/src/app/(organizer)/organizer/page.tsx)

### Change Log

- Expanded the organizer workspace from create-only into create plus manage.
- Added organizer event editing tied to backend event detail/update endpoints.
- Added ticket-type creation and update support on the organizer surface.
