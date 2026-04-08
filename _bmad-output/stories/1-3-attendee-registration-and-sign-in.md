# Story 1.3: Attendee Registration and Sign-In

Status: complete

## Story

As an attendee,
I want to create an account and sign in,
so that I can access ticket purchasing and ownership features tied to my identity.

## Acceptance Criteria

1. Given an attendee wants to continue from a public event page into ticketing features, when they choose to register, then the product presents a registration flow that collects the required account information, and the attendee can complete registration without unnecessary steps unrelated to ticket access.
2. Given an attendee already has an account, when they choose to sign in, then the product presents a sign-in flow that allows them to authenticate successfully, and successful authentication grants access to attendee-authorized features.
3. Given an attendee submits valid registration details, when the registration request is completed, then a new attendee account is created, and the attendee is informed that registration succeeded.
4. Given an attendee submits valid sign-in credentials, when the authentication request succeeds, then the attendee is signed in, and the product can identify them as an authenticated attendee user.
5. Given an attendee submits invalid or incomplete registration information, when the product validates the submission, then the attendee receives clear field-level or form-level error feedback, and the product explains what must be corrected before retrying.
6. Given an attendee submits invalid sign-in credentials or otherwise fails authentication, when the sign-in attempt is processed, then the product displays a clear failure message, and the message does not expose sensitive security details.
7. Given the registration or sign-in flow is opened on a mobile device, when the attendee uses the form, then the flow remains readable, keyboard-accessible, and operable on small screens, and form controls, labels, and validation messaging remain accessible.
8. Given authentication succeeds from a ticketing entry point, when the attendee returns to the product flow, then the product preserves enough context to continue the attendee toward the next relevant ticketing action, and the attendee is not forced to restart from an unrelated landing page.

## Tasks / Subtasks

- [x] Add a public attendee auth entry route and form shell. (AC: 1, 2, 7)
  - [x] Create a public auth page that supports register and sign-in modes.
  - [x] Keep the route accessible from public ticket discovery without requiring prior authentication.
  - [x] Ensure the layout remains mobile-first and keyboard accessible.

- [x] Add client-side validation and backend auth integration. (AC: 1, 2, 3, 4, 5, 6)
  - [x] Validate register and login inputs against the backend contract.
  - [x] Submit registration to `POST /api/auth/register`.
  - [x] Submit login to `POST /api/auth/login`.
  - [x] Surface backend validation and auth failures as clear form feedback.

- [x] Add a narrow attendee auth state foundation for post-auth navigation. (AC: 2, 4, 8)
  - [x] Create an in-memory auth context/provider for the authenticated attendee user and token.
  - [x] Redirect successful auth into the attendee area without losing the relevant event context.
  - [x] Make the attendee surface capable of reflecting the authenticated user after auth completes.

- [x] Connect public event discovery into the new auth flow. (AC: 1, 8)
  - [x] Update public event CTAs to send attendees into the auth route with context-preserving query params.
  - [x] Avoid implementing checkout or ticket purchase execution in this story.

- [x] Verify and keep the story intentionally narrow. (AC: 5, 6, 7, 8)
  - [x] Do not implement session restoration or sign-out yet; those belong to Story 1.4.
  - [x] Do not implement role-aware route protection yet; that belongs to Story 1.5.
  - [x] Confirm lint and production build pass after implementation.

## Dev Notes

- This story should build directly on the completed public event page and frontend shell.
- Keep auth accessible from public entry points while still redirecting successful users into the attendee surface.
- Session persistence across reloads is explicitly deferred to Story 1.4, so the auth state here can stay intentionally narrow.

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- Backend auth DTOs and service reviewed
- Existing public event and attendee surfaces reviewed
- Auth provider, public auth route, and attendee gateway implemented
- Verified frontend with `npm run lint` and `npm run build`

### Completion Notes List

- Added a public `/auth` route with register and sign-in modes, mobile-first form layout, and accessible error messaging.
- Integrated attendee auth with the backend `register` and `login` endpoints and surfaced backend error messages through the form.
- Added a narrow in-memory auth provider so successful auth can identify the attendee and route them into `/tickets` with preserved event context.
- Updated public event CTAs to enter the auth flow without implementing checkout or session persistence early.

### File List

- `/Users/arnoldekechi/RiderProjects/ticketsystem/_bmad-output/stories/1-3-attendee-registration-and-sign-in.md`
- `/Users/arnoldekechi/RiderProjects/ticketsystem/frontend/src/app/(public)/auth/page.tsx`
- `/Users/arnoldekechi/RiderProjects/ticketsystem/frontend/src/app/(public)/events/[slug]/page.tsx`
- `/Users/arnoldekechi/RiderProjects/ticketsystem/frontend/src/app/(attendee)/tickets/page.tsx`
- `/Users/arnoldekechi/RiderProjects/ticketsystem/frontend/src/components/providers/app-providers.tsx`
- `/Users/arnoldekechi/RiderProjects/ticketsystem/frontend/src/components/providers/auth-provider.tsx`
- `/Users/arnoldekechi/RiderProjects/ticketsystem/frontend/src/features/auth/attendee-gateway.tsx`
- `/Users/arnoldekechi/RiderProjects/ticketsystem/frontend/src/features/auth/auth-screen.tsx`
- `/Users/arnoldekechi/RiderProjects/ticketsystem/frontend/src/lib/api/client.ts`
- `/Users/arnoldekechi/RiderProjects/ticketsystem/frontend/src/lib/auth/auth-client.ts`
- `/Users/arnoldekechi/RiderProjects/ticketsystem/frontend/src/lib/auth/types.ts`

### Change Log

- 2026-04-08: Implemented Story 1.3 by adding public attendee auth UI, backend auth integration, in-memory auth state, and event-context redirects into the attendee surface.
