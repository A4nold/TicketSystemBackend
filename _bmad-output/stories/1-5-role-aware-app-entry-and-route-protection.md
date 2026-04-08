# Story 1.5: Role-Aware App Entry and Route Protection

Status: complete

## Story

As an authenticated user,
I want the product to direct me to the correct app area and protect routes by role,
so that I only see the functionality relevant to my access level and cannot enter unauthorized areas by mistake.

## Acceptance Criteria

1. Given a user is authenticated as an attendee, when they enter the authenticated product area, then they are directed to an attendee-appropriate destination, and they are not presented with organizer-only or scanner-only primary navigation by default.
2. Given a user is authenticated as an organizer, when they enter the authenticated product area, then they are directed to an organizer-appropriate destination, and organizer workflows are available according to their authorized access.
3. Given a user is authenticated as scanner staff, when they enter the authenticated product area, then they are directed to a scanner-appropriate destination, and the scanner workflow is accessible according to their assigned event access.
4. Given a user attempts to access a route outside their authorized role, when the product evaluates their access, then the route is blocked, and the user is redirected or shown a clear unauthorized-access state without exposing internal system details.
5. Given a user is not authenticated, when they attempt to access a protected attendee, organizer, or scanner route, then the product requires authentication before allowing access, and it preserves enough context to return the user to the intended flow after successful sign-in when appropriate.
6. Given a user has valid authentication but insufficient permissions for a specific organizer or scanner action, when they attempt to open that area, then the product shows a clear access-denied outcome, and the product does not present the restricted area as though it were usable.
7. Given route protection is enforced across the product, when the user navigates between public and protected surfaces, then public event pages remain accessible without authentication, and protected areas remain consistently guarded by authentication and role checks.

## Tasks / Subtasks

- [x] Add a shared frontend role-access model and post-auth destination logic. (AC: 1, 2, 3)
  - [x] Introduce shared surface-role utilities for determining visible surfaces and default destinations.
  - [x] Route authenticated users to the most appropriate destination after sign-in.
  - [x] Preserve requested protected destinations when the user actually has access to them.

- [x] Add protected surface gating for attendee, organizer, and scanner areas. (AC: 4, 5, 6, 7)
  - [x] Require authentication for `/tickets`, `/organizer`, and `/scanner`.
  - [x] Redirect unauthenticated users into `/auth` with the intended destination preserved.
  - [x] Show a clear access-denied state when the current account lacks access to organizer or scanner surfaces.

- [x] Make primary navigation role-aware. (AC: 1, 2, 3, 7)
  - [x] Hide organizer/scanner surface navigation from attendee-only sessions.
  - [x] Keep public navigation available across the app.
  - [x] Surface organizer or scanner navigation only when the current session includes those access roles.

- [x] Keep the story intentionally narrow and verify it. (AC: 4, 5, 6, 7)
  - [x] Do not implement organizer/scanner feature logic beyond access gating.
  - [x] Keep final authorization authority on the backend; the frontend role model remains a UI-routing layer.
  - [x] Confirm lint and production build pass after implementation.

## Dev Notes

- The current backend auth contract does not yet expose a universal user-role summary for organizer/scanner access.
- To keep Story 1.5 moving without inventing backend authority, the frontend now uses:
  - attendee access by default for authenticated users
  - temporary seeded demo-role derivation for organizer and scanner accounts via known local seed emails
- This means the routing and gating framework is real, but organizer/scanner role enrichment should later be replaced with a backend-backed role source.

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- Backend auth contract reviewed and found to lack a global organizer/scanner role summary
- Route protection, role-aware nav, and post-auth routing implemented in frontend
- Verified frontend with `npm run lint` and `npm run build`

### Completion Notes List

- Added a role-aware access model and protected surface gate for attendee, organizer, and scanner routes.
- Updated auth flows to route users to appropriate destinations after sign-in while preserving valid requested targets.
- Made navigation role-aware so attendee-only sessions do not see organizer/scanner surface links by default.
- Added clear unauthorized and re-auth states without implementing organizer/scanner feature logic early.

### File List

- `/Users/arnoldekechi/RiderProjects/ticketsystem/_bmad-output/stories/1-5-role-aware-app-entry-and-route-protection.md`
- `/Users/arnoldekechi/RiderProjects/ticketsystem/frontend/src/app/(organizer)/organizer/page.tsx`
- `/Users/arnoldekechi/RiderProjects/ticketsystem/frontend/src/app/(scanner)/scanner/page.tsx`
- `/Users/arnoldekechi/RiderProjects/ticketsystem/frontend/src/components/product/surface-shell.tsx`
- `/Users/arnoldekechi/RiderProjects/ticketsystem/frontend/src/components/providers/auth-provider.tsx`
- `/Users/arnoldekechi/RiderProjects/ticketsystem/frontend/src/features/auth/attendee-gateway.tsx`
- `/Users/arnoldekechi/RiderProjects/ticketsystem/frontend/src/features/auth/auth-screen.tsx`
- `/Users/arnoldekechi/RiderProjects/ticketsystem/frontend/src/features/auth/protected-surface-gate.tsx`
- `/Users/arnoldekechi/RiderProjects/ticketsystem/frontend/src/lib/auth/auth-client.ts`
- `/Users/arnoldekechi/RiderProjects/ticketsystem/frontend/src/lib/auth/role-access.ts`
- `/Users/arnoldekechi/RiderProjects/ticketsystem/frontend/src/lib/auth/types.ts`

### Change Log

- 2026-04-08: Implemented Story 1.5 with role-aware navigation, protected surface routing, access-denied handling, and smart post-auth destination selection.
