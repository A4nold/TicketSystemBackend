# Story 1.4: Authenticated Session and Sign-Out Flow

Status: complete

## Story

As an authenticated attendee,
I want my session to persist predictably and allow me to sign out,
so that I can return to my ticketing experience without repeated friction and still end access when I choose.

## Acceptance Criteria

1. Given an attendee has successfully signed in, when they navigate between attendee-accessible areas of the product, then their authenticated state is preserved, and they are not asked to sign in again during normal active use.
2. Given an attendee has successfully signed in, when they leave and later return to the product within a valid session window, then the product can restore their authenticated attendee state, and they can continue toward their next relevant ticketing action without repeating sign-in unnecessarily.
3. Given an attendee has an expired, invalid, or missing session, when they attempt to access an authenticated attendee flow, then the product requires authentication again, and it explains the need to sign in without exposing internal security details.
4. Given an attendee is authenticated, when they choose to sign out, then the product ends their active session, and attendee-only functionality is no longer accessible until they authenticate again.
5. Given an attendee signs out from the product, when sign-out completes, then the product confirms that access has ended, and the attendee is returned to an appropriate public or sign-in destination.
6. Given session restoration or session loss occurs on mobile or desktop, when the product updates the attendee’s access state, then the transition is clear and predictable, and the attendee is not left in an ambiguous partially-authenticated state.
7. Given the attendee was in the middle of a valid ticketing flow before a recoverable session restoration, when the product restores the session, then enough context is preserved to continue the user toward the relevant attendee area, and the attendee is not redirected to an unrelated destination by default.

## Tasks / Subtasks

- [x] Add persistent attendee session storage and restoration. (AC: 1, 2, 6, 7)
  - [x] Persist the attendee auth session locally after successful auth.
  - [x] Restore the saved session on app boot.
  - [x] Validate restored auth state against the backend `GET /api/auth/me` endpoint.

- [x] Handle missing, invalid, or expired sessions predictably. (AC: 3, 6)
  - [x] Clear invalid persisted auth state when restoration fails.
  - [x] Surface a clear message that sign-in is required again without exposing token internals.
  - [x] Avoid ambiguous half-authenticated UI during hydration.

- [x] Add attendee sign-out behavior. (AC: 4, 5)
  - [x] Expose a sign-out action from the attendee surface.
  - [x] Clear local attendee session state and persisted auth data.
  - [x] Return the attendee to an appropriate public or sign-in destination with a clear confirmation.

- [x] Keep the story intentionally narrow and verify it. (AC: 1, 2, 3, 4, 5, 6, 7)
  - [x] Do not implement role-aware route protection yet; that belongs to Story 1.5.
  - [x] Keep the attendee session scoped to current auth/session needs rather than building a full permission framework.
  - [x] Confirm lint and production build pass after implementation.

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- Existing auth provider, auth UI, and attendee gateway reviewed
- Added persisted auth session restoration and backend validation via `/api/auth/me`
- Added attendee sign-out flow and re-auth messaging
- Verified frontend with `npm run lint` and `npm run build`

### Completion Notes List

- Persisted attendee auth sessions in local storage and restore them predictably on app boot.
- Validate restored tokens against the backend `me` endpoint so expired or invalid sessions are cleared safely.
- Added clear hydration, expired-session, and signed-out messaging to the attendee/auth flow.
- Added attendee sign-out action that clears local session state and returns the user to a sign-in destination with confirmation.

### File List

- `/Users/arnoldekechi/RiderProjects/ticketsystem/_bmad-output/stories/1-4-authenticated-session-and-sign-out-flow.md`
- `/Users/arnoldekechi/RiderProjects/ticketsystem/frontend/src/components/providers/auth-provider.tsx`
- `/Users/arnoldekechi/RiderProjects/ticketsystem/frontend/src/features/auth/attendee-gateway.tsx`
- `/Users/arnoldekechi/RiderProjects/ticketsystem/frontend/src/features/auth/auth-screen.tsx`
- `/Users/arnoldekechi/RiderProjects/ticketsystem/frontend/src/lib/auth/auth-client.ts`

### Change Log

- 2026-04-08: Implemented Story 1.4 by adding session persistence, restoration validation, expired-session handling, and attendee sign-out.
