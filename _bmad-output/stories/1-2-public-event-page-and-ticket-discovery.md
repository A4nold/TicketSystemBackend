# Story 1.2: Public Event Page and Ticket Discovery

Status: complete

## Story

As an attendee,
I want to open a public event page and view its ticket options,
so that I can quickly understand the event and decide whether to begin buying a ticket.

## Acceptance Criteria

1. Given a valid public event link exists, when an attendee opens the event page, then the page displays the event title, date, time, location, and primary event description, and the page is usable on mobile and desktop screen sizes.
2. Given an event has one or more ticket types configured, when the attendee views the public event page, then the page displays each available ticket type with its name, price, and availability-related context, and unavailable or restricted ticket states are clearly distinguished from available ticket states.
3. Given the attendee is viewing the public event page, when the page finishes loading, then the attendee can identify the primary call to action for beginning ticket purchase without confusion, and the page does not require authentication just to view event details and ticket options.
4. Given the event page is shared through web or social channels, when the page is requested by a browser or crawler, then the page exposes metadata suitable for link previews and discoverable public access, and the canonical event route is stable and shareable.
5. Given the attendee opens the event page on a mobile device under normal network conditions, when the page renders, then the initial event information appears quickly enough to support confident browsing without noticeable friction, and the ticket-selection area remains reachable without excessive scrolling or layout instability.
6. Given the event cannot be found or is no longer publicly available, when a user opens the event link, then the product displays a clear not-found or unavailable state, and the message does not expose internal system details.

## Tasks / Subtasks

- [x] Add a public event detail route driven by event slug. (AC: 1, 4, 6)
  - [x] Create an App Router public event route that uses a stable slug-based URL.
  - [x] Add server-side event loading against the backend `GET /events/:slug` endpoint.
  - [x] Handle not-found and unavailable states without leaking backend internals.

- [x] Map backend event detail data into a public event presentation model. (AC: 1, 2, 5)
  - [x] Create a typed event detail domain model in the frontend `lib/api` or `features/events` layer.
  - [x] Normalize ticket-type data for name, price, quantity, max-per-order, sale windows, and active state.
  - [x] Format date, time, venue, and pricing details for mobile-first display.

- [x] Build the public event page UI for event understanding and ticket discovery. (AC: 1, 2, 3, 5)
  - [x] Present event identity, timing, location, and description clearly above the ticket selection area.
  - [x] Show ticket types with visible state and guardrails for unavailable or inactive options.
  - [x] Include a clear purchase-oriented call to action without requiring authentication yet.

- [x] Add metadata and shareability support for the event page. (AC: 4)
  - [x] Generate page metadata from fetched event data.
  - [x] Ensure the slug route acts as the canonical public event path.

- [x] Keep the story intentionally narrow and verify the route works cleanly. (AC: 3, 5, 6)
  - [x] Do not implement checkout, registration, session handling, or organizer/scanner logic in this story.
  - [x] Verify the route renders responsively and remains usable on small screens.
  - [x] Confirm lint and production build still pass after implementation.

## Dev Notes

- This story now follows the completed setup story in [1-1-frontend-starter-and-application-shell-setup.md](/Users/arnoldekechi/RiderProjects/ticketsystem/_bmad-output/stories/1-1-frontend-starter-and-application-shell-setup.md). Build on the existing `frontend/` shell rather than reorganizing routes again.
- Keep this route public and SEO-aware. Authentication belongs to Story 1.3, not this story.
- The goal here is event understanding and ticket discovery, not ticket purchase execution.

### Technical Requirements

- Use the existing isolated frontend app in `/frontend` with the App Router route-group structure already in place. [Source: [1-1-frontend-starter-and-application-shell-setup.md](/Users/arnoldekechi/RiderProjects/ticketsystem/_bmad-output/stories/1-1-frontend-starter-and-application-shell-setup.md)]
- Keep the backend as the system of record and fetch event detail from the NestJS API rather than hard-coding data. [Source: [frontend-architecture.md](/Users/arnoldekechi/RiderProjects/ticketsystem/_bmad-output/frontend-architecture.md#API-&-Communication-Patterns)]
- The public event route should remain compatible with SEO-aware rendering patterns and social sharing metadata. [Source: [prd.md](/Users/arnoldekechi/RiderProjects/ticketsystem/_bmad-output/prd.md#Web-App-Specific-Requirements)]
- Use the shared API foundation and token-based design primitives from Story 1.1 rather than inventing a separate fetch or styling pattern. [Source: [frontend/package.json](/Users/arnoldekechi/RiderProjects/ticketsystem/frontend/package.json), [client.ts](/Users/arnoldekechi/RiderProjects/ticketsystem/frontend/src/lib/api/client.ts)]

### Backend Contract Notes

- Public event detail is available from `GET /events/:slug` in [events.controller.ts](/Users/arnoldekechi/RiderProjects/ticketsystem/src/events/events.controller.ts).
- The response shape is defined by `EventDetailResponseDto` in [event-response.dto.ts](/Users/arnoldekechi/RiderProjects/ticketsystem/src/events/dto/event-response.dto.ts).
- Ticket-type fields already exposed by the backend include:
  - `id`
  - `name`
  - `description`
  - `price`
  - `currency`
  - `quantity`
  - `maxPerOrder`
  - `isActive`
  - `saleStartsAt`
  - `saleEndsAt`
- Event detail also includes organizer, venue, resale policy, and timing context that can support the public event page.

### Architecture Compliance

- Public event pages belong in the SEO-aware public surface, not the attendee-authenticated surface. [Source: [frontend-architecture.md](/Users/arnoldekechi/RiderProjects/ticketsystem/_bmad-output/frontend-architecture.md#Frontend-Architecture)]
- Use server components where that improves shareability and metadata generation, while keeping interactive ticket-selection affordances lightweight and scoped. [Source: [frontend-architecture.md](/Users/arnoldekechi/RiderProjects/ticketsystem/_bmad-output/frontend-architecture.md#Core-Architectural-Decisions)]
- Preserve mobile-first readability and avoid generic dashboard framing. [Source: [ux-design-specification.md](/Users/arnoldekechi/RiderProjects/ticketsystem/_bmad-output/ux-design-specification.md)]

### UX Compliance

- The page should feel credible, simple, and low-friction rather than admin-heavy. [Source: UX-DR6 in [epics.md](/Users/arnoldekechi/RiderProjects/ticketsystem/_bmad-output/epics.md)]
- Ticket options should be easy to scan on mobile and remain reachable without long, unstable layouts. [Source: UX-DR11 in [epics.md](/Users/arnoldekechi/RiderProjects/ticketsystem/_bmad-output/epics.md)]
- Unavailable or restricted ticket states must be explicit rather than implied. [Source: [prd.md](/Users/arnoldekechi/RiderProjects/ticketsystem/_bmad-output/prd.md), FR10 / FR48]

### Testing Requirements

- At minimum for this story:
  - the public event route renders for a valid slug
  - unavailable slugs resolve to a clean not-found or unavailable state
  - metadata generation does not break the build
  - `npm run lint` passes
  - `npm run build` passes

### Project Structure Notes

- Existing frontend foundation lives in `/Users/arnoldekechi/RiderProjects/ticketsystem/frontend`.
- Existing public shell currently lives in [frontend/src/app/(public)/page.tsx](/Users/arnoldekechi/RiderProjects/ticketsystem/frontend/src/app/(public)/page.tsx); Story 1.2 should extend the public surface rather than replacing the route architecture.
- Do not alter the backend deployment setup or root Node service as part of this story.

### References

- [epics.md](/Users/arnoldekechi/RiderProjects/ticketsystem/_bmad-output/epics.md#Story-1.2:-Public-Event-Page-and-Ticket-Discovery)
- [prd.md](/Users/arnoldekechi/RiderProjects/ticketsystem/_bmad-output/prd.md#Web-App-Specific-Requirements)
- [frontend-architecture.md](/Users/arnoldekechi/RiderProjects/ticketsystem/_bmad-output/frontend-architecture.md)
- [ux-design-specification.md](/Users/arnoldekechi/RiderProjects/ticketsystem/_bmad-output/ux-design-specification.md)
- [events.controller.ts](/Users/arnoldekechi/RiderProjects/ticketsystem/src/events/events.controller.ts)
- [event-response.dto.ts](/Users/arnoldekechi/RiderProjects/ticketsystem/src/events/dto/event-response.dto.ts)

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- Story definition loaded from epic breakdown
- Backend event detail endpoint and DTOs reviewed for implementation context
- Existing frontend Story 1.1 shell confirmed as the foundation
- Implemented slug-based public event route with server-side event loading and metadata generation
- Verified frontend with `npm run lint` and `npm run build`

### Completion Notes List

- Added `/events/[slug]` public route with canonical metadata and clear unavailable states.
- Mapped backend event detail data into a typed public-event presentation layer in `features/events`.
- Built a mobile-first event summary and ticket discovery UI with explicit ticket availability messaging.
- Kept checkout, registration, session handling, and organizer/scanner behavior out of scope for this story.

### File List

- `/Users/arnoldekechi/RiderProjects/ticketsystem/_bmad-output/stories/1-2-public-event-page-and-ticket-discovery.md`
- `/Users/arnoldekechi/RiderProjects/ticketsystem/frontend/src/app/(public)/events/[slug]/not-found.tsx`
- `/Users/arnoldekechi/RiderProjects/ticketsystem/frontend/src/app/(public)/events/[slug]/page.tsx`
- `/Users/arnoldekechi/RiderProjects/ticketsystem/frontend/src/app/(public)/page.tsx`
- `/Users/arnoldekechi/RiderProjects/ticketsystem/frontend/src/features/events/public-event.ts`
- `/Users/arnoldekechi/RiderProjects/ticketsystem/frontend/src/lib/api/client.ts`

### Change Log

- 2026-04-08: Implemented Story 1.2 by adding a slug-based public event route, typed event mapping, metadata generation, and ticket discovery UI.
