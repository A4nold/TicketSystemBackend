# Story 5.3: Organizer Resale Rule Management

Status: complete

## Story

As an organizer,
I want to define and update resale rules for my event,
so that ticket resale happens within the boundaries I control rather than through unmanaged informal channels.

## Acceptance Criteria

1. Given an organizer has access to an event they manage, when they open the resale settings area, then the product allows them to view the current resale policy for that event, and the organizer can understand whether resale is enabled, restricted, or unavailable.
2. Given the organizer wants to configure resale behavior, when they submit valid resale rule settings, then the product saves the updated resale policy for the event, and the organizer receives clear confirmation that the new rules are now in effect.
3. Given the organizer is editing resale rules, when the resale settings interface is shown, then the product communicates the meaning of the available resale controls clearly, and the organizer can understand how those rules will affect attendee resale eligibility.
4. Given the organizer submits invalid or contradictory resale rules, when the product validates the settings, then the product blocks the invalid update, and it provides clear feedback about what must be corrected before the rules can be saved.
5. Given resale rules affect attendee actions after publication, when those rules are updated successfully, then the product reflects the latest resale policy in future attendee resale decisions, and the organizer can trust that the event’s resale path is governed by the updated rules.
6. Given a non-organizer or unauthorized user attempts to access resale rule management, when the product evaluates access, then the resale settings controls are blocked, and the product returns a clear unauthorized-access outcome without exposing organizer-only configuration details.
7. Given the organizer uses resale rule management on mobile or desktop, when the settings interface is rendered, then the controls and explanatory context remain readable and usable at supported breakpoints, and the workflow does not require the organizer to infer policy behavior from unclear labels.
8. Given the product cannot save resale rule changes because of a temporary system or network issue, when the organizer submits the update, then the product shows a clear failure or retry state, and it does not leave the organizer uncertain about whether the resale policy actually changed.

## Tasks / Subtasks

- [x] Add a dedicated organizer resale policy panel. (AC: 1, 3, 7)
  - [x] Surface current resale-enabled state, window, and cap clearly.
  - [x] Add operational explanation copy for how attendee resale eligibility is governed.

- [x] Add a dedicated resale rule save path. (AC: 2, 4, 5, 8)
  - [x] Save only resale-related event fields through the existing organizer update endpoint.
  - [x] Show resale-policy-specific success and error messaging.

- [x] Keep organizer event editing aligned after separating resale management. (AC: 1, 3)
  - [x] Remove resale controls from the general event details section.
  - [x] Keep the organizer workspace coherent across event editing, resale policy, and ticket types.

- [x] Verify the implementation. (AC: 1-8)
  - [x] Confirm lint passes.
  - [x] Confirm production build passes.

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Completion Notes List

- Added a dedicated organizer resale-policy management panel.
- Separated resale-rule saves from general event-detail saves for clearer organizer intent.
- Improved organizer-facing explanations of how resale windows and caps affect attendee eligibility.

### File List

- [frontend/src/features/organizer/event-management-panel.tsx](/Users/arnoldekechi/RiderProjects/ticketsystem/frontend/src/features/organizer/event-management-panel.tsx)

### Change Log

- Split resale settings into their own organizer panel.
- Added resale-policy-specific summary, guidance, and save messaging.
- Simplified the general event details section by removing embedded resale controls.
