# Story 5.4: Staff Invitation, Acceptance, and Role Management

Status: complete

## Story

As an organizer,
I want to invite staff, manage their roles, and support invitation acceptance,
so that the right people can access event operations with the correct permissions.

## Acceptance Criteria

1. Given an organizer has access to an event they manage, when they open the staff management area, then the product displays the current staff members and their roles for that event, and the organizer can distinguish accepted staff access from pending invitation states.
2. Given the organizer wants to add staff to an event, when they submit a valid staff invitation, then the product creates the invitation successfully, and the organizer receives clear confirmation that the invited person can now accept access through the platform.
3. Given an invited staff member accesses the invitation flow as an authenticated user, when they accept the invitation successfully, then the product grants them event access according to the assigned role, and their staff state is reflected as accepted rather than pending.
4. Given the organizer needs to change staff permissions for an event, when they update a staff member’s role successfully, then the product saves the updated role, and future event access reflects the new permission level.
5. Given an invitation or role change is invalid, duplicated, or no longer applicable, when the organizer or invited user submits the action, then the product blocks the invalid action, and it provides clear feedback about why the request cannot be completed.
6. Given a non-organizer or unauthorized user attempts to access staff invitation or role-management controls, when the product evaluates access, then those controls are blocked, and the product does not expose organizer-only staff management functionality.
7. Given the staff management flow is used on mobile or desktop, when the interface is rendered, then invitation state, role information, and primary management actions remain readable and usable at supported breakpoints, and the product preserves operational clarity for organizer decisions.
8. Given the product cannot create an invitation, accept an invitation, or save a role change because of a temporary system or network issue, when the affected user submits the action, then the product shows a clear failure or retry state, and it does not leave staff access in an ambiguous state.

## Tasks / Subtasks

- [x] Extend organizer staff client support. (AC: 1, 2, 4, 8)
  - [x] Add list, invite, update-role, revoke, and accept-invite calls.
  - [x] Reuse the existing event detail and membership model for current staff visibility.

- [x] Add organizer staff management UI. (AC: 1, 2, 4, 5, 6, 7, 8)
  - [x] Show current staff with accepted vs pending status.
  - [x] Support inviting new admin or scanner staff.
  - [x] Support updating roles and revoking non-owner staff.

- [x] Add pending invite acceptance flow for invited users. (AC: 3, 5, 8)
  - [x] Surface pending staff invites on the attendee surface.
  - [x] Let invited users accept staff invites and refresh their session roles immediately.

- [x] Verify the implementation. (AC: 1-8)
  - [x] Confirm lint passes.
  - [x] Confirm production build passes.

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Completion Notes List

- Added organizer-side staff invitation and role management for event memberships.
- Added attendee-side pending staff invite acceptance with immediate session refresh.
- Kept owner protections intact by only allowing admin/scanner role updates and revokes through the UI.

### File List

- [frontend/src/lib/organizer/events-client.ts](/Users/arnoldekechi/RiderProjects/ticketsystem/frontend/src/lib/organizer/events-client.ts)
- [frontend/src/features/organizer/event-management-panel.tsx](/Users/arnoldekechi/RiderProjects/ticketsystem/frontend/src/features/organizer/event-management-panel.tsx)
- [frontend/src/features/staff/pending-staff-invites-panel.tsx](/Users/arnoldekechi/RiderProjects/ticketsystem/frontend/src/features/staff/pending-staff-invites-panel.tsx)
- [frontend/src/features/auth/attendee-gateway.tsx](/Users/arnoldekechi/RiderProjects/ticketsystem/frontend/src/features/auth/attendee-gateway.tsx)

### Change Log

- Added organizer-side staff invitation, role update, and revoke controls.
- Added attendee-side pending invite acceptance and session hydration after acceptance.
- Added clear accepted vs pending staff state visibility.
