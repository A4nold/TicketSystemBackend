# Story 4.4: Resale Listing and Resale State Visibility

Status: complete

## Story

As an attendee who owns a ticket,
I want to list an eligible ticket for resale and understand its resale state,
so that I can use the organizer-controlled resale path without confusion about availability or ownership.

## Acceptance Criteria

1. Given an authenticated attendee is viewing a ticket they currently own, when that ticket is eligible for resale under the event's rules, then the product presents resale as an available action, and the attendee can begin the resale listing flow from the owned-ticket experience.
2. Given the attendee starts a resale listing for an eligible ticket, when the resale request is submitted successfully, then the product reflects that the ticket is now resale listed, and the attendee receives clear confirmation of the new resale state.
3. Given a ticket is not eligible for resale because of policy, timing, pricing constraints, state, or ownership conditions, when the attendee attempts to list it, then the product blocks the resale action, and it provides a clear explanation of why resale is not currently allowed.
4. Given the attendee is creating a resale listing, when the resale flow is displayed, then the product communicates the applicable organizer-controlled resale rules clearly, and the attendee can understand the effect of listing the ticket before confirming the action.
5. Given a ticket is already resale listed or otherwise unavailable for a new resale action, when the attendee attempts to create another resale listing, then the product prevents contradictory resale actions, and the current resale-related state remains understandable.
6. Given a ticket is currently resale listed, when the attendee views the owned-ticket list or ticket detail, then the resale-listed state is visible and distinguishable from active, transfer pending, used, or unavailable states, and the attendee can understand that the ticket is in a resale workflow.
7. Given a resale state changes because of listing creation, listing removal, sale completion, or another lifecycle event, when the attendee opens or refreshes the relevant ticket view, then the product reflects the latest available resale state from the system, and outdated state is not shown as current truth.
8. Given the resale flow is used on a mobile device, when the attendee creates or reviews a resale listing, then the listing action, resale state, and rule explanations remain readable and usable on a small screen, and the attendee is not forced to infer the meaning of the resale state.
9. Given the product cannot create or refresh the resale listing state because of a temporary system or network issue, when the attendee attempts the resale action, then the product shows a clear failure or retry state, and it does not leave the attendee uncertain about whether the listing was actually created.

## Tasks / Subtasks

- [x] Extend the frontend for attendee resale listing calls. (AC: 1, 2, 3, 9)
  - [x] Add a resale client for creating listings from owned tickets.
  - [x] Normalize backend resale failures into clear attendee-facing messaging.

- [x] Add resale listing controls to ticket detail. (AC: 1, 2, 3, 4, 5, 8, 9)
  - [x] Show resale listing only when the current ticket state is plausibly eligible.
  - [x] Capture asking price and optional expiry from the attendee.
  - [x] Explain the effect of listing before submission.

- [x] Surface current resale state alongside listing controls. (AC: 5, 6, 7)
  - [x] Show the current resale state and pricing context when a listing already exists.
  - [x] Refresh ticket detail after listing creation so backend truth is reflected immediately.

- [x] Verify the implementation. (AC: 1-9)
  - [x] Confirm lint passes.
  - [x] Confirm production build passes.

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Completion Notes List

- Added attendee resale listing API support and a dedicated resale panel in ticket detail.
- Kept resale state visible even when listing is blocked or already active.
- Refreshed ticket detail from backend truth after successful resale creation.

### File List

- [frontend/src/lib/resale/resale-client.ts](/Users/arnoldekechi/RiderProjects/ticketsystem/frontend/src/lib/resale/resale-client.ts)
- [frontend/src/features/tickets/ticket-resale-panel.tsx](/Users/arnoldekechi/RiderProjects/ticketsystem/frontend/src/features/tickets/ticket-resale-panel.tsx)
- [frontend/src/features/tickets/owned-ticket-detail.tsx](/Users/arnoldekechi/RiderProjects/ticketsystem/frontend/src/features/tickets/owned-ticket-detail.tsx)

### Change Log

- Added seller-side resale listing flow to owned ticket detail.
- Added resale-state messaging for active and blocked listing states.
- Integrated resale creation into the existing ticket refresh loop.
