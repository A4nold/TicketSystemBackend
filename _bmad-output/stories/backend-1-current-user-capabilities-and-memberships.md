# Backend Story 1: Current User Capabilities and Accepted Memberships

Status: complete

## Story

As an authenticated user,
I want the backend to return my application roles and accepted event memberships,
so that the frontend can determine attendee, organizer, and scanner access from backend truth instead of demo email heuristics.

## Acceptance Criteria

1. Given an authenticated active user calls the current-user endpoint, when the backend returns the user payload, then the response includes the user’s accepted event memberships and event-scoped staff roles alongside the existing identity fields.
2. Given an authenticated user has one or more accepted `OWNER` or `ADMIN` staff memberships, when the backend returns the current-user payload, then the response includes an organizer-capable app role.
3. Given an authenticated user has one or more accepted `SCANNER` staff memberships, when the backend returns the current-user payload, then the response includes a scanner-capable app role.
4. Given an authenticated user has no accepted staff memberships, when the backend returns the current-user payload, then the response still includes attendee access and an empty membership collection rather than omitting the field.
5. Given a staff membership invite exists but has not been accepted, when the current-user payload is generated, then that pending membership is not treated as active app access.
6. Given the current-user payload is consumed by the frontend, when the frontend uses it for routing and navigation decisions, then it can stop relying on seeded email-based role derivation.
7. Given the backend returns capabilities for the current user, when the response is documented, then the contract is explicit enough for frontend implementation and future RBAC guard work.

## Implements

- FR3: The product can distinguish attendee, organizer, and scanner roles and expose the appropriate capabilities to each.
- FR37: Authorized scanner staff can access scanner functionality for an assigned event.
- NFR5: All authenticated actions must require valid user identity and enforce role-appropriate access.
- NFR20: The frontend must interoperate reliably with the deployed backend API as the system of record for ticket state.
- Backend assessment priority: backend-driven RBAC and capabilities.

## Tasks / Subtasks

- [ ] Extend the auth response contract for current-user identity. (AC: 1, 4, 7)
  - [ ] Add DTO fields for `appRoles` and accepted `memberships`.
  - [ ] Keep existing identity fields stable so current frontend auth does not break unexpectedly.
  - [ ] Define the response shape clearly in Swagger/OpenAPI annotations.

- [ ] Add membership-aware current-user lookup logic in the auth service. (AC: 1, 2, 3, 4, 5)
  - [ ] Load accepted `staffMemberships` for the current user.
  - [ ] Exclude pending or revoked access from effective capabilities.
  - [ ] Include enough membership detail for frontend routing decisions such as `eventId`, `role`, and `acceptedAt`.

- [ ] Derive backend-driven app roles from accepted memberships. (AC: 2, 3, 4)
  - [ ] Always include attendee access for authenticated users.
  - [ ] Add organizer-capable access when the user has accepted `OWNER` or `ADMIN` memberships.
  - [ ] Add scanner-capable access when the user has accepted `SCANNER` memberships.
  - [ ] Ensure role derivation is deterministic and de-duplicated.

- [ ] Keep the change narrow and backward-safe. (AC: 1, 6, 7)
  - [ ] Do not attempt the full RBAC guard refactor in this story.
  - [ ] Do not change login/register token semantics in this story.
  - [ ] Limit the scope to exposing backend truth needed to unblock frontend role handling.

- [ ] Verify and document the contract. (AC: 6, 7)
  - [ ] Add or update tests around current-user capability derivation if test coverage exists in the backend.
  - [ ] Verify the authenticated endpoint returns the expected role/membership shape for seeded attendee, organizer, and scanner users.
  - [ ] Note the frontend follow-up to replace demo email heuristics with this payload.

## Dev Notes

- Current current-user endpoint:
  - [auth.controller.ts](/Users/arnoldekechi/RiderProjects/ticketsystem/src/auth/auth.controller.ts)
  - [auth.service.ts](/Users/arnoldekechi/RiderProjects/ticketsystem/src/auth/auth.service.ts)
- Current frontend heuristic to replace:
  - [role-access.ts](/Users/arnoldekechi/RiderProjects/ticketsystem/frontend/src/lib/auth/role-access.ts)
- Relevant event-scoped role model:
  - [schema.prisma](/Users/arnoldekechi/RiderProjects/ticketsystem/prisma/schema.prisma)
  - `StaffRole` enum: `OWNER`, `ADMIN`, `SCANNER`
- Relevant existing guard pattern:
  - [scanner-membership.guard.ts](/Users/arnoldekechi/RiderProjects/ticketsystem/src/auth/guards/scanner-membership.guard.ts)

Suggested response shape:

```json
{
  "id": "user_id",
  "email": "organizer@campusnight.ie",
  "status": "ACTIVE",
  "firstName": "Maya",
  "lastName": "Okafor",
  "appRoles": ["attendee", "organizer", "scanner"],
  "memberships": [
    {
      "id": "membership_id",
      "eventId": "event_id",
      "role": "OWNER",
      "acceptedAt": "2026-04-09T09:10:00.000Z"
    }
  ]
}
```

Implementation guidance:

- Prefer extending `/auth/me` rather than creating a second identity endpoint unless the current response contract becomes too awkward.
- Treat accepted memberships as the authoritative source for organizer/scanner access.
- Keep organizer access tied to event-scoped roles, not a platform-wide hard-coded user type.

## Source References

- [backend-assessment.md](/Users/arnoldekechi/RiderProjects/ticketsystem/_bmad-output/backend-assessment.md)
- [frontend-architecture.md](/Users/arnoldekechi/RiderProjects/ticketsystem/_bmad-output/frontend-architecture.md)
- [epics.md](/Users/arnoldekechi/RiderProjects/ticketsystem/_bmad-output/epics.md)
- [1-5-role-aware-app-entry-and-route-protection.md](/Users/arnoldekechi/RiderProjects/ticketsystem/_bmad-output/stories/1-5-role-aware-app-entry-and-route-protection.md)

## Handoff Notes

This story is the bridge between the existing backend auth layer and the frontend protected-surface model.

Once complete:

- frontend auth/session code should switch from seeded email heuristics to backend-provided `appRoles` and `memberships`
- later backend work can build declarative RBAC guards on top of the same role model

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- Extended the backend auth response contract to include `appRoles` and accepted `memberships`
- Updated frontend auth/session handling to consume backend-provided access roles
- Removed demo email-based organizer/scanner role derivation from the frontend
- Verified backend typecheck plus frontend lint and production build

### Completion Notes List

- `/auth/me` now returns backend-driven capability data suitable for frontend routing.
- Login and register responses now return the same enriched user shape as the current-user endpoint.
- Only accepted memberships are exposed as active access.
- Organizer access is derived from accepted `OWNER` or `ADMIN` memberships.
- Scanner access is derived from accepted `SCANNER` memberships.
- Frontend protected-surface routing now depends on backend truth instead of seeded email heuristics.

### File List

- `/Users/arnoldekechi/RiderProjects/ticketsystem/_bmad-output/stories/backend-1-current-user-capabilities-and-memberships.md`
- `/Users/arnoldekechi/RiderProjects/ticketsystem/src/auth/auth.service.ts`
- `/Users/arnoldekechi/RiderProjects/ticketsystem/src/auth/dto/auth-response.dto.ts`
- `/Users/arnoldekechi/RiderProjects/ticketsystem/frontend/src/lib/auth/types.ts`
- `/Users/arnoldekechi/RiderProjects/ticketsystem/frontend/src/lib/auth/auth-client.ts`
- `/Users/arnoldekechi/RiderProjects/ticketsystem/frontend/src/lib/auth/role-access.ts`
- `/Users/arnoldekechi/RiderProjects/ticketsystem/frontend/src/components/providers/auth-provider.tsx`

### Change Log

- 2026-04-09: Implemented backend-driven current-user capabilities and switched frontend role access to consume backend-provided `appRoles` and `memberships`.
