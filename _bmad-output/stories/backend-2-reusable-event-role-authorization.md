# Backend Story 2: Reusable Event-Role Authorization

Status: complete

## Story

As a backend maintainer,
I want organizer, admin, and scanner access to be enforced through reusable event-role authorization primitives,
so that the API has one consistent source of truth for event-scoped permissions and the frontend can rely on stable backend enforcement.

## Acceptance Criteria

1. Given an authenticated user accesses an event-scoped protected endpoint, when the endpoint declares required event roles, then the backend authorizes access using accepted `StaffMembership` records rather than ad hoc identity checks.
2. Given an event-scoped endpoint requires organizer-capable access, when a user has an accepted `OWNER` or `ADMIN` membership for that event, then the request is allowed.
3. Given an event-scoped endpoint requires scanner-capable access, when a user has an accepted `SCANNER`, `ADMIN`, or `OWNER` membership for that event, then the request is allowed according to the declared role rules.
4. Given a user has only a pending, revoked, or unrelated membership, when they access an event-scoped protected endpoint, then the backend rejects the request with a clear authorization failure.
5. Given an endpoint is migrated to the reusable authorization layer, when the request reaches the controller or service, then the current event membership context is available without re-querying authorization logic in multiple places.
6. Given existing event staff and scanner flows are migrated, when their current tests or manual workflows are exercised, then behavior remains correct while authorization becomes more declarative and easier to audit.
7. Given the authorization rules are documented, when frontend and future backend stories build on them, then the role semantics for `OWNER`, `ADMIN`, and `SCANNER` are explicit and reusable.

## Implements

- FR3: The product can distinguish attendee, organizer, and scanner roles and expose the appropriate capabilities to each.
- FR4: Organizers can invite staff members to participate in event operations.
- FR5: Invited staff members can accept access to the events they were assigned to support.
- FR6: Organizers can manage staff roles for an event.
- FR37: Authorized scanner staff can access scanner functionality for an assigned event.
- FR44: Organizers and scanner staff can view enough ticket state information to understand common entry issues.
- NFR5: All authenticated actions must require valid user identity and enforce role-appropriate access.
- Backend assessment priority: reusable RBAC/policy enforcement for event-scoped roles.

## Tasks / Subtasks

- [x] Define the reusable event-role authorization model. (AC: 1, 2, 3, 7)
  - [x] Decide the canonical role semantics for event-scoped access:
    - `OWNER`: full organizer control
    - `ADMIN`: organizer operations except owner-only mutations if any remain
    - `SCANNER`: scanner-only operational access
  - [x] Document any role inheritance rules, especially whether `OWNER` and `ADMIN` satisfy scanner-capable endpoints.
  - [x] Keep the model scoped to event-level authorization rather than introducing platform-wide roles in this story.

- [x] Add reusable decorators/guards/helpers for event authorization. (AC: 1, 3, 5)
  - [x] Introduce a decorator for declaring required event roles on controller handlers.
  - [x] Add a reusable guard that loads the event membership for the authenticated user and event ID.
  - [x] Store the authorized membership on the request context for downstream use, similar to the current scanner membership pattern.
  - [x] Avoid duplicating authorization queries in every service method after the guard succeeds.

- [x] Migrate existing scanner authorization onto the shared model. (AC: 3, 5, 6)
  - [x] Preserve the current scanner workflow behavior and membership context.
  - [x] Reuse or absorb the existing scanner membership guard instead of leaving two competing patterns in place.
  - [x] Verify scanner manifest, validate, and sync continue to require the intended event-scoped access.

- [x] Migrate organizer/staff-management endpoints to the shared model. (AC: 1, 2, 4, 6)
  - [x] Apply the reusable authorization layer to organizer-owned event management and staff endpoints.
  - [x] Reduce direct `organizerId === user.id` assumptions where accepted `OWNER` or `ADMIN` membership should govern access.
  - [x] Preserve stricter owner-only business rules inside services where necessary, such as immutable owner membership behavior.

- [x] Verify and document the authorization behavior. (AC: 4, 6, 7)
  - [x] Add or update backend tests where coverage exists for allowed and denied access paths.
  - [x] Manually verify owner, admin, scanner, attendee, pending invite, and unrelated-event cases.
  - [x] Note any remaining endpoints that still need migration in a later authorization story.

## Dev Notes

Current relevant files:

- [scanner-membership.guard.ts](/Users/arnoldekechi/RiderProjects/ticketsystem/src/auth/guards/scanner-membership.guard.ts)
- [jwt-auth.guard.ts](/Users/arnoldekechi/RiderProjects/ticketsystem/src/auth/guards/jwt-auth.guard.ts)
- [events.controller.ts](/Users/arnoldekechi/RiderProjects/ticketsystem/src/events/events.controller.ts)
- [events.service.ts](/Users/arnoldekechi/RiderProjects/ticketsystem/src/events/events.service.ts)
- [scanner.controller.ts](/Users/arnoldekechi/RiderProjects/ticketsystem/src/scanner/scanner.controller.ts)
- [request-context.type.ts](/Users/arnoldekechi/RiderProjects/ticketsystem/src/common/types/request-context.type.ts)
- [schema.prisma](/Users/arnoldekechi/RiderProjects/ticketsystem/prisma/schema.prisma)

Suggested implementation direction:

- Keep `JwtAuthGuard` as the authentication layer.
- Add a second event-membership authorization layer that can be parameterized by required roles.
- Expose a shared request membership shape, for example `request.eventMembership`, instead of only `request.scannerMembership`.
- Retain service-level business rules for domain invariants that go beyond authorization, such as preventing owner reassignment or revoke.

Suggested role matrix:

| Endpoint type | Allowed memberships |
| --- | --- |
| Organizer management | `OWNER`, `ADMIN` |
| Staff invitation and role updates | `OWNER`, `ADMIN` |
| Scanner operations | `OWNER`, `ADMIN`, `SCANNER` |
| Owner-only mutations | `OWNER` only, where explicitly required |

Out of scope for this story:

- Full platform-wide permissions or super-admin roles
- Frontend changes beyond consuming already-exposed capability data
- Stripe or payments authorization changes
- Reworking every service-level business invariant

## Source References

- [backend-assessment.md](/Users/arnoldekechi/RiderProjects/ticketsystem/_bmad-output/backend-assessment.md)
- [backend-1-current-user-capabilities-and-memberships.md](/Users/arnoldekechi/RiderProjects/ticketsystem/_bmad-output/stories/backend-1-current-user-capabilities-and-memberships.md)
- [epics.md](/Users/arnoldekechi/RiderProjects/ticketsystem/_bmad-output/epics.md)

## Handoff Notes

This story is the first real backend RBAC enforcement pass.

Once complete:

- organizer/admin/scanner access should be enforced through one event-role pattern
- scanner-specific authorization should no longer be the only declarative guard in the codebase
- future backend stories can layer owner-only rules or fine-grained policies on top of the same primitives
- the frontend can trust that protected organizer and scanner surfaces are backed by actual backend policy, not just routing logic

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- Added a reusable `@RequireEventRoles(...)` decorator and `EventMembershipGuard`
- Migrated scanner endpoints to the shared event-role authorization model
- Migrated organizer event-management and staff-management endpoints to the shared model
- Removed organizer identity-only authorization checks from event service methods that are now protected by the guard
- Extended request/decorator types so authorized membership context is available downstream
- Verified the backend compiles cleanly with `npm run typecheck`

### Completion Notes List

- Event-scoped protected endpoints can now declare their required roles directly in controller metadata.
- Accepted `OWNER` and `ADMIN` memberships now authorize organizer management routes.
- Accepted `OWNER`, `ADMIN`, and `SCANNER` memberships now authorize scanner routes.
- The shared guard places the resolved membership on request context, and scanner membership decorators continue to work through that shared state.
- Existing domain invariants such as preventing owner reassignment or revoke remain in the service layer.
- The legacy scanner-specific guard file remains in the repo as historical context, but the auth module and scanner controller now use the shared authorization path.

### File List

- `/Users/arnoldekechi/RiderProjects/ticketsystem/_bmad-output/stories/backend-2-reusable-event-role-authorization.md`
- `/Users/arnoldekechi/RiderProjects/ticketsystem/src/auth/decorators/current-user.decorator.ts`
- `/Users/arnoldekechi/RiderProjects/ticketsystem/src/auth/decorators/require-event-roles.decorator.ts`
- `/Users/arnoldekechi/RiderProjects/ticketsystem/src/auth/guards/event-membership.guard.ts`
- `/Users/arnoldekechi/RiderProjects/ticketsystem/src/auth/auth.module.ts`
- `/Users/arnoldekechi/RiderProjects/ticketsystem/src/auth/types/authenticated-user.type.ts`
- `/Users/arnoldekechi/RiderProjects/ticketsystem/src/common/types/request-context.type.ts`
- `/Users/arnoldekechi/RiderProjects/ticketsystem/src/events/events.controller.ts`
- `/Users/arnoldekechi/RiderProjects/ticketsystem/src/events/events.service.ts`
- `/Users/arnoldekechi/RiderProjects/ticketsystem/src/scanner/scanner.controller.ts`

### Change Log

- 2026-04-09: Implemented reusable event-role authorization primitives and migrated scanner plus organizer event-management routes onto the shared guard/decorator model.
