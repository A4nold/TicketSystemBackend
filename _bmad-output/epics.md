---
stepsCompleted: [1, 2, 3, 4]
inputDocuments:
  - "/Users/arnoldekechi/RiderProjects/ticketsystem/_bmad-output/prd.md"
  - "/Users/arnoldekechi/RiderProjects/ticketsystem/_bmad-output/architecture.md"
  - "/Users/arnoldekechi/RiderProjects/ticketsystem/_bmad-output/frontend-architecture.md"
  - "/Users/arnoldekechi/RiderProjects/ticketsystem/_bmad-output/ux-design-specification.md"
status: "complete"
---

# Private Event Smart Ticketing Platform - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for Private Event Smart Ticketing Platform, decomposing the requirements from the PRD, UX Design, and Architecture requirements into implementable stories.

## Requirements Inventory

### Functional Requirements

FR1: Attendees can create an account and sign in to access ticketing features.
FR2: Returning users can authenticate and resume access to their role-appropriate product areas.
FR3: The product can distinguish attendee, organizer, and scanner roles and expose the appropriate capabilities to each.
FR4: Organizers can invite staff members to participate in event operations.
FR5: Invited staff members can accept access to the events they were assigned to support.
FR6: Organizers can manage staff roles for an event.
FR7: Users can sign out and end their authenticated session.
FR8: Attendees can open a public event page from a shared link or direct navigation.
FR9: Attendees can view core event details, including timing, location, and ticket options.
FR10: Attendees can view available ticket types and ticket pricing for an event.
FR11: Public event pages can present metadata suitable for shareable and discoverable web access.
FR12: Attendees can begin a ticket purchase flow for an event.
FR13: Attendees can select a ticket type and quantity within event rules.
FR14: Attendees can complete checkout and payment for ticket purchases.
FR15: The product can confirm when an order has been successfully paid.
FR16: The product can issue tickets to the purchasing attendee after successful payment.
FR17: Attendees can receive immediate confirmation that purchased tickets are now associated with their account.
FR18: Attendees can view a list of tickets they currently own.
FR19: Attendees can open an individual owned ticket and view its details.
FR20: Attendees can view the current status of a ticket they own.
FR21: Attendees can retrieve a scan-ready QR representation of an active owned ticket.
FR22: The product can reflect changes in ticket ownership or availability state when a transfer, resale, or usage event occurs.
FR23: Attendees can distinguish between active, transferred, resale-listed, used, and unavailable ticket states.
FR24: Attendees can initiate a transfer for an eligible ticket they own.
FR25: Recipients can accept a transfer and become the new ticket owner.
FR26: The product can update ticket ownership when a transfer is completed.
FR27: Attendees can initiate resale for an eligible ticket they own.
FR28: Attendees can view the current resale state of a ticket they listed.
FR29: The product can enforce event-specific rules for transfer and resale eligibility.
FR30: The product can make ticket state changes explicit after transfer or resale actions.
FR31: Organizers can create an event.
FR32: Organizers can edit event details after creation.
FR33: Organizers can create ticket types for an event.
FR34: Organizers can update ticket-type details, pricing, and availability rules.
FR35: Organizers can define or update resale-related rules for an event.
FR36: Organizers can review the operational readiness of an event before entry begins.
FR37: Authorized scanner staff can access scanner functionality for an assigned event.
FR38: Scanner users can retrieve the event-specific data needed for entry validation.
FR39: Scanner users can validate a ticket presented for entry.
FR40: The product can return a clear validation outcome for a scanned ticket.
FR41: Scanner users can distinguish between valid, already used, invalid, and otherwise ineligible tickets.
FR42: The product can reflect live ticket state during entry validation.
FR43: The product can support scanner workflows under degraded connectivity conditions.
FR44: Organizers and scanner staff can view enough ticket state information to understand common entry issues.
FR45: The product can communicate why a ticket cannot currently be used for entry.
FR46: The product can preserve an auditable history of important ticket-state and scan-related changes.
FR47: The product can help operational users distinguish between ownership issues, usage issues, and invalid-ticket situations.
FR48: The product can present public pages optimized for web sharing and authenticated areas optimized for app-like use.
FR49: The product can keep high-stakes ticket and order information reasonably fresh during active use.
FR50: The product can support mobile-first interaction across attendee, organizer, and scanner workflows.

### NonFunctional Requirements

NFR1: Public event pages should render quickly enough that users opening a shared event link can understand the event and begin purchase without noticeable friction.
NFR2: Authenticated users should be able to reach their owned-ticket view and open a scan-ready ticket without delay that would undermine confidence at the venue.
NFR3: Scanner validation feedback should be returned quickly enough to keep an entry line moving without hesitation or repeated attempts.
NFR4: Real-time or near-real-time ticket freshness should update often enough that users and staff are not working from stale ownership or usage state during active event operations.
NFR5: All authenticated actions must require valid user identity and enforce role-appropriate access.
NFR6: Ticket ownership, transfer, resale, and scan validation actions must only be executable by authorized users or staff.
NFR7: Sensitive user and ticket data must be protected in transit and at rest.
NFR8: Payment processing must rely on secure external payment infrastructure rather than exposing raw payment handling responsibilities directly within the product.
NFR9: The system must maintain clear auditability for high-risk state changes such as payment confirmation, ownership transfer, resale completion, and ticket usage.
NFR10: The product must operate in a manner consistent with responsible handling of user data and privacy obligations applicable to a public-facing web product.
NFR11: The system should remain dependable during high-pressure event windows such as ticket drops, pre-entry ticket access, and live scanning periods.
NFR12: Ticket state should remain authoritative and internally consistent across purchase, transfer, resale, and scan workflows.
NFR13: The product should fail clearly rather than ambiguously when live state cannot be confirmed.
NFR14: Scanner workflows should continue to behave predictably under degraded connectivity conditions, even when full live confirmation is temporarily limited.
NFR15: Recovery from transient failures should preserve trust by making the current state understandable to the user or staff member.
NFR16: The frontend should meet a practical WCAG 2.1 AA-minded standard for contrast, focus visibility, labeling, and keyboard accessibility.
NFR17: Critical ticket and scanner states must never rely on color alone to communicate meaning.
NFR18: The product should remain usable on mobile devices in poor lighting and stressful real-world event conditions.
NFR19: Forms, navigation, and authentication flows should be operable by users with common visual, motor, and interaction limitations.
NFR20: The frontend must interoperate reliably with the deployed backend API as the system of record for ticket state.
NFR21: Payment-related flows must integrate reliably with the selected payment processor and its confirmation lifecycle.
NFR22: The product should support shareable public event links and metadata suitable for web and social sharing surfaces.
NFR23: Deployment configuration should support separate but coordinated frontend and backend services in production.
NFR24: The product should support traffic spikes around event launches, purchase windows, and venue entry periods without collapsing the core attendee and scanner workflows.
NFR25: Initial architecture should support growth across multiple events and organizers without requiring a redesign of the product’s basic operating model.
NFR26: Increased usage should degrade gracefully, with core ticket access and validation prioritized over secondary surfaces if load increases.

### Additional Requirements

- Build the frontend as a Next.js PWA rather than a native app for V1.
- Use the deployed NestJS backend as the authoritative system of record for ticket, order, and scan state.
- Structure the frontend as a web client only, not a second business backend.
- Use a shared typed API client layer for backend communication across auth, events, orders, tickets, scanner, and staff domains.
- Use TanStack Query for remote server state, invalidation, and freshness-sensitive flows.
- Support route-group separation for public, attendee, organizer, and scanner surfaces.
- Keep scanner workflows compatible with online validation, manifest retrieval, and degraded connectivity sync paths.
- Preserve backend authority for ownership changes, QR validity, and scan consumption rules.
- Support environment-driven Railway deployment with a public API base URL and separate frontend service.
- Treat the app as mobile-first, but preserve usable organizer flows on tablet and desktop.
- Plan for limited offline-first behavior focused on scanner resilience and lightweight ticket-access resilience.
- Keep implementation aligned with the backend module boundaries: auth, events, ticket-types, orders, tickets, transfers, resales, scanner, staff, payments, and audit.
- Preserve support for signed QR payloads and ownership revision invalidation across transfer and resale flows.
- Avoid a large global client store unless a later feature proves the need.

### UX Design Requirements

UX-DR1: The app must surface the next active owned ticket quickly after sign-in, reducing the distance between authentication and ticket readiness.
UX-DR2: The owned ticket detail experience must place ticket status and the QR surface in a hierarchy that makes readiness immediately obvious without interpretation.
UX-DR3: Ticket states such as active, transfer pending, resale listed, used, and unavailable must be communicated with explicit labels and supporting context rather than generic or ambiguous status text.
UX-DR4: Transfer and resale actions must include clear guardrails and explicit ownership-state feedback before and after the action completes.
UX-DR5: Scanner validation screens must present high-contrast, unmistakable valid, used, and invalid outcomes that can be understood in seconds under pressure.
UX-DR6: Public event pages must feel credible, simple, and low-friction while still supporting shareability and clear ticket-type selection.
UX-DR7: Organizer event setup flows must feel operationally lightweight and avoid generic dashboard clutter, especially around ticket types, resale rules, and staff management.
UX-DR8: The design system must implement a consistent token foundation for typography, spacing, semantic status colors, and motion that supports attendee, organizer, and scanner contexts.
UX-DR9: Motion and interaction feedback must reinforce live state and confidence without becoming noisy, over-gamified, or distracting in high-stakes contexts.
UX-DR10: Critical scanner and ticket states must never rely on color alone and must remain legible on small screens and in poor lighting conditions.
UX-DR11: Responsive layouts must preserve the dominance of high-value objects such as the active ticket, QR surface, and scan result state across mobile and larger breakpoints.
UX-DR12: The product must treat tickets as live stateful objects rather than static receipts, reflecting server-backed freshness and state changes throughout the attendee journey.

### FR Coverage Map

FR1: Epic 1 - Public Event Access and Attendee Authentication
FR2: Epic 1 - Public Event Access and Attendee Authentication
FR3: Epic 1 - Public Event Access and Attendee Authentication
FR4: Epic 5 - Organizer Event and Staff Operations
FR5: Epic 5 - Organizer Event and Staff Operations
FR6: Epic 5 - Organizer Event and Staff Operations
FR7: Epic 1 - Public Event Access and Attendee Authentication
FR8: Epic 1 - Public Event Access and Attendee Authentication
FR9: Epic 1 - Public Event Access and Attendee Authentication
FR10: Epic 1 - Public Event Access and Attendee Authentication
FR11: Epic 1 - Public Event Access and Attendee Authentication
FR12: Epic 2 - Ticket Purchase and Issuance
FR13: Epic 2 - Ticket Purchase and Issuance
FR14: Epic 2 - Ticket Purchase and Issuance
FR15: Epic 2 - Ticket Purchase and Issuance
FR16: Epic 2 - Ticket Purchase and Issuance
FR17: Epic 2 - Ticket Purchase and Issuance
FR18: Epic 3 - Owned Ticket Wallet and QR Readiness
FR19: Epic 3 - Owned Ticket Wallet and QR Readiness
FR20: Epic 3 - Owned Ticket Wallet and QR Readiness
FR21: Epic 3 - Owned Ticket Wallet and QR Readiness
FR22: Epic 3 - Owned Ticket Wallet and QR Readiness
FR23: Epic 3 - Owned Ticket Wallet and QR Readiness
FR24: Epic 4 - Ticket Transfer and Resale Lifecycle
FR25: Epic 4 - Ticket Transfer and Resale Lifecycle
FR26: Epic 4 - Ticket Transfer and Resale Lifecycle
FR27: Epic 4 - Ticket Transfer and Resale Lifecycle
FR28: Epic 4 - Ticket Transfer and Resale Lifecycle
FR29: Epic 4 - Ticket Transfer and Resale Lifecycle
FR30: Epic 4 - Ticket Transfer and Resale Lifecycle
FR31: Epic 5 - Organizer Event and Staff Operations
FR32: Epic 5 - Organizer Event and Staff Operations
FR33: Epic 5 - Organizer Event and Staff Operations
FR34: Epic 5 - Organizer Event and Staff Operations
FR35: Epic 5 - Organizer Event and Staff Operations
FR36: Epic 5 - Organizer Event and Staff Operations
FR37: Epic 6 - Scanner Validation and Entry Operations
FR38: Epic 6 - Scanner Validation and Entry Operations
FR39: Epic 6 - Scanner Validation and Entry Operations
FR40: Epic 6 - Scanner Validation and Entry Operations
FR41: Epic 6 - Scanner Validation and Entry Operations
FR42: Epic 6 - Scanner Validation and Entry Operations
FR43: Epic 6 - Scanner Validation and Entry Operations
FR44: Epic 7 - Operational Visibility and Incident Handling
FR45: Epic 6 - Scanner Validation and Entry Operations
FR46: Epic 7 - Operational Visibility and Incident Handling
FR47: Epic 7 - Operational Visibility and Incident Handling
FR48: Epic 1 - Public Event Access and Attendee Authentication
FR49: Epic 2 - Ticket Purchase and Issuance / Epic 3 - Owned Ticket Wallet and QR Readiness
FR50: Epic 1 - Public Event Access and Attendee Authentication / Epic 3 - Owned Ticket Wallet and QR Readiness / Epic 6 - Scanner Validation and Entry Operations

## Epic List

### Epic 1: Public Event Access and Attendee Authentication
Attendees can open an event from a shared link, understand ticket options, and create or resume an account so they can enter the ticketing experience with confidence.
**FRs covered:** FR1, FR2, FR3, FR7, FR8, FR9, FR10, FR11, FR48, FR50

### Epic 2: Ticket Purchase and Issuance
Attendees can select tickets, complete checkout, and receive issued tickets in their account immediately after successful payment.
**FRs covered:** FR12, FR13, FR14, FR15, FR16, FR17, FR49

### Epic 3: Owned Ticket Wallet and QR Readiness
Attendees can access their owned tickets, understand current ticket state, and retrieve a scan-ready QR with confidence.
**FRs covered:** FR18, FR19, FR20, FR21, FR22, FR23, FR49, FR50

### Epic 4: Ticket Transfer and Resale Lifecycle
Attendees can transfer or resell eligible tickets and clearly understand ownership changes and enforcement of event rules.
**FRs covered:** FR24, FR25, FR26, FR27, FR28, FR29, FR30

### Epic 5: Organizer Event and Staff Operations
Organizers can create and manage events, configure ticket types and resale rules, and manage event staff access.
**FRs covered:** FR4, FR5, FR6, FR31, FR32, FR33, FR34, FR35, FR36

### Epic 6: Scanner Validation and Entry Operations
Scanner staff can access event scanning, validate tickets, receive clear outcomes, and operate reliably in live entry conditions.
**FRs covered:** FR37, FR38, FR39, FR40, FR41, FR42, FR43, FR45, FR50

### Epic 7: Operational Visibility and Incident Handling
Organizers and scanner staff can understand ticket issues, review important state changes, and troubleshoot entry problems with sufficient visibility.
**FRs covered:** FR44, FR46, FR47

## Epic 1: Public Event Access and Attendee Authentication

Attendees can open an event from a shared link, understand ticket options, and create or resume an account so they can enter the ticketing experience with confidence.

### Story 1.1: Frontend Starter and Application Shell Setup

As the product team,
I want the frontend initialized from the approved starter and core app shell,
So that attendee, organizer, and scanner features are built on a consistent, deployable foundation.

**Implements:** Additional Requirements (Next.js PWA foundation, shared API client direction, route-group separation, environment-driven deployment), UX-DR8

**Acceptance Criteria:**

**Given** the frontend architecture specifies a Next.js App Router starter with TypeScript and Tailwind
**When** the project foundation is created
**Then** the frontend exists as a working starter application aligned to the approved architecture
**And** the base project can be run locally and prepared for deployment without additional ad hoc setup

**Given** the product must support public, attendee, organizer, and scanner surfaces
**When** the application shell is initialized
**Then** the route structure supports separation of those surfaces
**And** the shared app shell does not force later stories to reorganize the application structure fundamentally

**Given** the frontend must integrate with the deployed backend API
**When** the initial foundation is created
**Then** environment-driven API configuration is in place
**And** the app is prepared to consume the backend as an external system of record

**Given** the product requires a themeable design-system foundation
**When** the starter shell is initialized
**Then** the styling foundation supports the approved token-based design direction
**And** the shell is ready for reusable UI primitives and product components

**Given** the starter setup is completed
**When** later feature stories begin
**Then** they can build on the existing shell without depending on future setup work
**And** the setup story does not attempt to implement unrelated feature behavior prematurely

### Story 1.2: Public Event Page and Ticket Discovery

As an attendee,
I want to open a public event page and view its ticket options,
So that I can quickly understand the event and decide whether to begin buying a ticket.

**Implements:** FR8, FR9, FR10, FR11, FR48, FR50; NFR1, NFR22; UX-DR6, UX-DR11

**Acceptance Criteria:**

**Given** a valid public event link exists
**When** an attendee opens the event page
**Then** the page displays the event title, date, time, location, and primary event description
**And** the page is usable on mobile and desktop screen sizes

**Given** an event has one or more ticket types configured
**When** the attendee views the public event page
**Then** the page displays each available ticket type with its name, price, and availability-related context
**And** unavailable or restricted ticket states are clearly distinguished from available ticket states

**Given** the attendee is viewing the public event page
**When** the page finishes loading
**Then** the attendee can identify the primary call to action for beginning ticket purchase without confusion
**And** the page does not require authentication just to view event details and ticket options

**Given** the event page is shared through web or social channels
**When** the page is requested by a browser or crawler
**Then** the page exposes metadata suitable for link previews and discoverable public access
**And** the canonical event route is stable and shareable

**Given** the attendee opens the event page on a mobile device under normal network conditions
**When** the page renders
**Then** the initial event information appears quickly enough to support confident browsing without noticeable friction
**And** the ticket-selection area remains reachable without excessive scrolling or layout instability

**Given** the event cannot be found or is no longer publicly available
**When** a user opens the event link
**Then** the product displays a clear not-found or unavailable state
**And** the message does not expose internal system details

### Story 1.3: Attendee Registration and Sign-In

As an attendee,
I want to create an account and sign in,
So that I can access ticket purchasing and ownership features tied to my identity.

**Implements:** FR1, FR2; NFR5, NFR16, NFR19

**Acceptance Criteria:**

**Given** an attendee wants to continue from a public event page into ticketing features
**When** they choose to register
**Then** the product presents a registration flow that collects the required account information
**And** the attendee can complete registration without unnecessary steps unrelated to ticket access

**Given** an attendee already has an account
**When** they choose to sign in
**Then** the product presents a sign-in flow that allows them to authenticate successfully
**And** successful authentication grants access to attendee-authorized features

**Given** an attendee submits valid registration details
**When** the registration request is completed
**Then** a new attendee account is created
**And** the attendee is informed that registration succeeded

**Given** an attendee submits valid sign-in credentials
**When** the authentication request succeeds
**Then** the attendee is signed in
**And** the product can identify them as an authenticated attendee user

**Given** an attendee submits invalid or incomplete registration information
**When** the product validates the submission
**Then** the attendee receives clear field-level or form-level error feedback
**And** the product explains what must be corrected before retrying

**Given** an attendee submits invalid sign-in credentials or otherwise fails authentication
**When** the sign-in attempt is processed
**Then** the product displays a clear failure message
**And** the message does not expose sensitive security details

**Given** the registration or sign-in flow is opened on a mobile device
**When** the attendee uses the form
**Then** the flow remains readable, keyboard-accessible, and operable on small screens
**And** form controls, labels, and validation messaging remain accessible

**Given** authentication succeeds from a ticketing entry point
**When** the attendee returns to the product flow
**Then** the product preserves enough context to continue the attendee toward the next relevant ticketing action
**And** the attendee is not forced to restart from an unrelated landing page

### Story 1.4: Authenticated Session and Sign-Out Flow

As an authenticated attendee,
I want my session to persist predictably and allow me to sign out,
So that I can return to my ticketing experience without repeated friction and still end access when I choose.

**Implements:** FR2, FR7; NFR5, NFR7, NFR20

**Acceptance Criteria:**

**Given** an attendee has successfully signed in
**When** they navigate between attendee-accessible areas of the product
**Then** their authenticated state is preserved
**And** they are not asked to sign in again during normal active use

**Given** an attendee has successfully signed in
**When** they leave and later return to the product within a valid session window
**Then** the product can restore their authenticated attendee state
**And** they can continue toward their next relevant ticketing action without repeating sign-in unnecessarily

**Given** an attendee has an expired, invalid, or missing session
**When** they attempt to access an authenticated attendee flow
**Then** the product requires authentication again
**And** it explains the need to sign in without exposing internal security details

**Given** an attendee is authenticated
**When** they choose to sign out
**Then** the product ends their active session
**And** attendee-only functionality is no longer accessible until they authenticate again

**Given** an attendee signs out from the product
**When** sign-out completes
**Then** the product confirms that access has ended
**And** the attendee is returned to an appropriate public or sign-in destination

**Given** session restoration or session loss occurs on mobile or desktop
**When** the product updates the attendee’s access state
**Then** the transition is clear and predictable
**And** the attendee is not left in an ambiguous partially-authenticated state

**Given** the attendee was in the middle of a valid ticketing flow before a recoverable session restoration
**When** the product restores the session
**Then** enough context is preserved to continue the user toward the relevant attendee area
**And** the attendee is not redirected to an unrelated destination by default

### Story 1.5: Role-Aware App Entry and Route Protection

As an authenticated user,
I want the product to direct me to the correct app area and protect routes by role,
So that I only see the functionality relevant to my access level and cannot enter unauthorized areas by mistake.

**Implements:** FR3, FR48, FR50; NFR5, NFR20

**Acceptance Criteria:**

**Given** a user is authenticated as an attendee
**When** they enter the authenticated product area
**Then** they are directed to an attendee-appropriate destination
**And** they are not presented with organizer-only or scanner-only primary navigation by default

**Given** a user is authenticated as an organizer
**When** they enter the authenticated product area
**Then** they are directed to an organizer-appropriate destination
**And** organizer workflows are available according to their authorized access

**Given** a user is authenticated as scanner staff
**When** they enter the authenticated product area
**Then** they are directed to a scanner-appropriate destination
**And** the scanner workflow is accessible according to their assigned event access

**Given** a user attempts to access a route outside their authorized role
**When** the product evaluates their access
**Then** the route is blocked
**And** the user is redirected or shown a clear unauthorized-access state without exposing internal system details

**Given** a user is not authenticated
**When** they attempt to access a protected attendee, organizer, or scanner route
**Then** the product requires authentication before allowing access
**And** it preserves enough context to return the user to the intended flow after successful sign-in when appropriate

**Given** a user has valid authentication but insufficient permissions for a specific organizer or scanner action
**When** they attempt to open that area
**Then** the product shows a clear access-denied outcome
**And** the product does not present the restricted area as though it were usable

**Given** route protection is enforced across the product
**When** the user navigates between public and protected surfaces
**Then** public event pages remain accessible without authentication
**And** protected areas remain consistently guarded by authentication and role checks

## Epic 2: Ticket Purchase and Issuance

Attendees can select tickets, complete checkout, and receive issued tickets in their account immediately after successful payment.

### Story 2.1: Ticket Selection and Checkout Start

As an attendee,
I want to select a ticket type and quantity and begin checkout,
So that I can start purchasing access to an event with clear pricing and availability.

**Implements:** FR12, FR13, FR14; NFR1, NFR20; UX-DR6

**Acceptance Criteria:**

**Given** an event has one or more purchasable ticket types
**When** an attendee selects a ticket type from the public event page
**Then** the product allows the attendee to choose a valid quantity within the event's purchase rules
**And** the attendee can clearly see the selected ticket type, quantity, and pricing context before continuing

**Given** the attendee has selected a valid ticket type and quantity
**When** they choose to continue to checkout
**Then** the product starts the checkout flow
**And** the attendee is taken to the next purchase step without losing the selected ticket details

**Given** the attendee is not authenticated when they try to begin checkout
**When** the product requires identity-bound purchase access
**Then** the attendee is prompted to register or sign in before proceeding
**And** the selected event and ticket context is preserved so they can continue checkout after authentication

**Given** a selected ticket type is unavailable, restricted, or exceeds the allowed quantity
**When** the attendee attempts to continue
**Then** the product blocks checkout start
**And** it displays a clear explanation of why the current selection cannot be purchased

**Given** the attendee is reviewing their intended purchase
**When** the checkout entry step is shown
**Then** the product displays enough summary information for the attendee to confirm they are buying the correct ticket selection
**And** the total price shown matches the selected quantity and ticket pricing

**Given** the attendee begins checkout from a mobile device
**When** the checkout start flow is rendered
**Then** the ticket selection summary and primary action remain readable and operable on a small screen
**And** the interface does not introduce unnecessary friction before payment begins

**Given** the product cannot start checkout because of a recoverable system or network issue
**When** the attendee attempts to continue
**Then** the product shows a clear failure state
**And** the attendee can retry without having to rebuild the entire ticket selection from scratch

### Story 2.2: Checkout Payment Completion Handling

As an attendee,
I want the product to handle checkout completion clearly,
So that I know whether my payment succeeded, failed, or still needs confirmation before I expect tickets to appear.

**Implements:** FR14, FR15, FR49; NFR8, NFR20, NFR21

**Acceptance Criteria:**

**Given** an attendee has started checkout for a valid ticket selection
**When** they complete the payment step successfully
**Then** the product recognizes the successful checkout outcome
**And** it presents a clear success state that indicates the purchase has been accepted or is being confirmed

**Given** an attendee completes payment and the backend confirms the order as paid
**When** the product receives the updated order state
**Then** the attendee is informed that payment succeeded
**And** the product continues the attendee into the post-purchase ticket confirmation flow

**Given** an attendee exits or returns from the payment step with an unsuccessful outcome
**When** the product evaluates the checkout result
**Then** it displays a clear failure or incomplete-payment state
**And** the attendee is not misled into believing tickets were issued

**Given** a payment outcome is still pending or awaiting backend confirmation
**When** the attendee returns from checkout
**Then** the product displays a clear in-progress or pending-confirmation state
**And** it explains that ticket availability depends on final confirmation

**Given** payment completion handling occurs after an external checkout handoff
**When** the attendee returns to the product
**Then** the selected order context is recoverable
**And** the attendee can understand which purchase attempt the product is resolving

**Given** the product cannot determine checkout completion because of a temporary system or network issue
**When** the attendee lands back in the app
**Then** the product shows a clear retry or refresh path
**And** it avoids displaying contradictory payment or ticket states

**Given** checkout completion is shown on a mobile device
**When** the attendee views the result
**Then** the payment outcome, next action, and current order state are readable and actionable on a small screen
**And** the attendee is not forced through unrelated navigation before understanding the result

### Story 2.3: Post-Payment Ticket Issuance Confirmation

As an attendee,
I want to see that my tickets were issued immediately after successful payment,
So that I can trust that my purchase is complete and my ticket is now in my account.

**Implements:** FR16, FR17, FR49; NFR4, NFR12; UX-DR1

**Acceptance Criteria:**

**Given** an attendee has a successfully paid order
**When** the backend issues tickets for that order
**Then** the product shows a post-purchase confirmation state
**And** the attendee is informed that the purchased tickets are now associated with their account

**Given** tickets have been issued from a successful order
**When** the attendee views the confirmation outcome
**Then** the product displays enough ticket-related information to confirm what was purchased
**And** the attendee can proceed directly toward their owned-ticket experience

**Given** an attendee has just completed a successful purchase
**When** they move from payment completion into ticket confirmation
**Then** the transition reinforces that the purchase is complete
**And** the attendee is not left in doubt about whether ticket issuance happened

**Given** ticket issuance has not yet completed even though payment succeeded
**When** the attendee views the post-payment state
**Then** the product communicates that issuance is still being finalized
**And** it avoids incorrectly presenting the tickets as already available

**Given** the attendee opens their account immediately after a successful purchase
**When** they view their owned tickets
**Then** the newly issued tickets are visible without requiring unusual delay or manual troubleshooting
**And** the attendee can identify them as the tickets from the recent purchase

**Given** the product encounters a temporary issue while reflecting newly issued tickets
**When** the attendee attempts to verify their purchase
**Then** the product shows a clear recovery path such as refresh or retry
**And** it does not display contradictory order and ticket states

**Given** the attendee is on a mobile device after purchase
**When** they view the ticket issuance confirmation
**Then** the confirmation, recent purchase context, and route into owned tickets are readable and usable on a small screen
**And** the next appropriate action is visually clear

## Epic 3: Owned Ticket Wallet and QR Readiness

Attendees can access their owned tickets, understand current ticket state, and retrieve a scan-ready QR with confidence.

### Story 3.1: Owned Ticket List

As an attendee,
I want to view the tickets I currently own,
So that I can quickly find the ticket that matters and confirm what access I currently have.

**Implements:** FR18, FR22, FR23, FR49, FR50; NFR2, NFR4; UX-DR1, UX-DR3, UX-DR11

**Acceptance Criteria:**

**Given** an authenticated attendee owns one or more tickets
**When** they open their ticket wallet or owned-ticket area
**Then** the product displays a list of their currently owned tickets
**And** each ticket entry includes enough identifying information for the attendee to distinguish it from other owned tickets

**Given** an attendee owns multiple tickets
**When** the owned-ticket list is shown
**Then** the most relevant active ticket is easy to identify
**And** active or high-priority tickets are not buried behind less relevant entries

**Given** an attendee views the owned-ticket list
**When** each ticket entry is rendered
**Then** the ticket's current state is visible at a glance
**And** states such as active, transfer pending, resale listed, used, or unavailable are distinguishable without requiring the attendee to open each ticket first

**Given** the attendee selects a ticket from the owned-ticket list
**When** they choose a specific ticket entry
**Then** the product navigates them to that ticket's detail experience
**And** the selected ticket context is preserved correctly

**Given** an attendee has no currently owned tickets
**When** they open the owned-ticket area
**Then** the product displays a clear empty state
**And** the empty state does not imply that hidden or unavailable tickets are still active

**Given** an attendee recently completed a successful purchase or ownership change
**When** they open or refresh the owned-ticket list
**Then** the list reflects the latest owned-ticket state available from the system
**And** newly issued or newly transferred tickets appear without contradictory status information

**Given** the attendee opens the owned-ticket list on a mobile device
**When** the wallet screen is rendered
**Then** the ticket list is readable and easy to scan on a small screen
**And** the primary active ticket remains visually prominent

**Given** the product cannot retrieve the owned-ticket list because of a temporary system or network issue
**When** the attendee opens the wallet area
**Then** the product shows a clear loading failure or retry state
**And** the attendee is not shown misleading stale ownership information as current truth

### Story 3.2: Ticket Detail and Live Ticket State

As an attendee,
I want to open a ticket and clearly understand its current status,
So that I can know whether it is valid, usable, or affected by transfer, resale, or prior usage.

**Implements:** FR19, FR20, FR22, FR23; NFR12, NFR13; UX-DR2, UX-DR3, UX-DR12

**Acceptance Criteria:**

**Given** an authenticated attendee selects a ticket they currently own
**When** the ticket detail page opens
**Then** the product displays the ticket's identifying details, event context, and current ticket state
**And** the attendee can understand what ticket they are viewing without ambiguity

**Given** the attendee is viewing a currently valid ticket
**When** the ticket detail is shown
**Then** the product presents the ticket as active and ready for entry
**And** the state language reinforces confidence rather than forcing interpretation

**Given** the attendee is viewing a ticket affected by transfer, resale, prior use, or another limiting condition
**When** the ticket detail is shown
**Then** the product displays the current limiting state clearly
**And** it explains enough context for the attendee to understand why the ticket is not in a normal active state

**Given** the ticket's ownership or lifecycle state changes because of a purchase, transfer, resale, or scan event
**When** the attendee opens or refreshes the ticket detail view
**Then** the product reflects the latest available server-backed state
**And** outdated state is not presented as though it were current truth

**Given** the attendee opens a ticket they do not currently own or cannot access
**When** the product evaluates the request
**Then** the product blocks access to that ticket detail
**And** it returns a clear not-found or unavailable outcome without exposing another user's ticket information

**Given** the attendee is viewing ticket detail on a mobile device
**When** the page renders
**Then** the ticket state, event information, and next relevant action are readable without excessive scrolling or visual clutter
**And** the ticket's status remains more visually prominent than secondary metadata

**Given** the product cannot retrieve the latest ticket detail because of a temporary system or network issue
**When** the attendee opens the ticket
**Then** the product shows a clear loading, retry, or unavailable state
**And** it avoids creating false confidence about ticket validity

### Story 3.3: Scan-Ready QR Retrieval and Presentation

As an attendee,
I want to retrieve and display a scan-ready QR for my active ticket,
So that I can present it at entry with confidence and without confusion.

**Implements:** FR21, FR22, FR23, FR49, FR50; NFR2, NFR4, NFR16, NFR17; UX-DR2, UX-DR10, UX-DR12

**Acceptance Criteria:**

**Given** an authenticated attendee is viewing an active ticket they currently own
**When** they request the ticket's QR
**Then** the product retrieves a scan-ready QR representation for that ticket
**And** the QR is presented within the owned-ticket experience without forcing the attendee through unrelated steps

**Given** the attendee is viewing a ticket that is active and valid for entry
**When** the QR view is displayed
**Then** the ticket's readiness state and QR are visually clear together
**And** the attendee can immediately understand that this is the code to present at the door

**Given** the attendee is viewing a ticket that is not currently eligible for normal entry presentation
**When** they attempt to access the QR view
**Then** the product communicates the current limiting state clearly
**And** it does not present an entry-ready QR as though the ticket were normally usable

**Given** the QR depends on current ticket ownership or state
**When** the attendee opens or refreshes the QR view
**Then** the product reflects the latest available server-backed QR state
**And** old or invalidated ticket state is not presented as current truth

**Given** the attendee opens the QR view on a mobile device in a live event context
**When** the QR screen is rendered
**Then** the QR is large enough and clear enough to be scanned easily
**And** the ticket state and supporting context remain readable under typical event-entry conditions

**Given** the attendee needs to return from the QR view to the broader ticket context
**When** they leave the QR presentation screen
**Then** they can return to the ticket detail or wallet flow without losing context
**And** the navigation remains simple and predictable

**Given** the product cannot retrieve or refresh the QR because of a temporary system or network issue
**When** the attendee attempts to open the QR view
**Then** the product shows a clear unavailable or retry state
**And** it avoids implying that a valid scan-ready QR is available when current truth cannot be confirmed

## Epic 4: Ticket Transfer and Resale Lifecycle

Attendees can transfer or resell eligible tickets and clearly understand ownership changes and enforcement of event rules.

### Story 4.1: Transfer Eligibility and Transfer Start

As an attendee who owns a ticket,
I want to start a transfer only when the ticket is eligible,
So that I can hand off my ticket through the platform with clear rules and without confusion.

**Implements:** FR24, FR29, FR30; NFR12; UX-DR4

**Acceptance Criteria:**

**Given** an authenticated attendee is viewing a ticket they currently own
**When** that ticket is eligible for transfer under the event's rules
**Then** the product presents transfer as an available action
**And** the attendee can begin the transfer flow from the owned-ticket experience

**Given** an attendee starts a transfer for an eligible ticket
**When** the transfer request is submitted successfully
**Then** the product reflects that the ticket is now in a transfer-pending state
**And** the attendee receives clear confirmation that ownership has not yet changed until acceptance is completed

**Given** a ticket is not eligible for transfer because of event policy, timing, state, or ownership conditions
**When** the attendee attempts to start a transfer
**Then** the product blocks the action
**And** it provides a clear explanation of why transfer is not currently allowed

**Given** the attendee is starting a transfer
**When** the transfer initiation flow is shown
**Then** the product communicates the consequences of starting the transfer clearly
**And** it avoids implying that the ticket is immediately gone before acceptance occurs

**Given** a transfer request already exists or the ticket is otherwise unavailable for a new transfer
**When** the attendee attempts to start another transfer
**Then** the product prevents duplicate or contradictory transfer initiation
**And** the current transfer-related state remains understandable

**Given** the attendee views the ticket after starting a transfer
**When** the owned-ticket list or ticket detail is refreshed
**Then** the ticket state is shown as transfer pending
**And** the attendee can distinguish that state from active, resale-listed, used, or unavailable states

**Given** the transfer flow is used on a mobile device
**When** the attendee starts the transfer
**Then** the action, resulting state, and any blocking reason remain readable and usable on a small screen
**And** the transfer path does not require unnecessary navigation or guesswork

**Given** the product cannot start a transfer because of a temporary system or network issue
**When** the attendee submits the transfer initiation
**Then** the product shows a clear failure or retry state
**And** it does not leave the attendee uncertain about whether the transfer request was actually created

### Story 4.2: Transfer Acceptance and Ownership Update

As a transfer recipient,
I want to accept a pending transfer and become the new ticket owner,
So that the ticket moves to my account through a clear and trustworthy ownership change.

**Implements:** FR25, FR26, FR30; NFR12; UX-DR4, UX-DR12

**Acceptance Criteria:**

**Given** a valid pending transfer exists for a ticket
**When** the intended recipient opens the transfer acceptance flow as an authenticated user
**Then** the product displays enough ticket and event context for them to understand what they are accepting
**And** the product makes it clear that acceptance will transfer ownership into their account

**Given** the recipient is eligible to accept the pending transfer
**When** they confirm acceptance
**Then** the product completes the transfer
**And** the ticket ownership is updated to the recipient's account

**Given** a transfer has been accepted successfully
**When** the ownership update completes
**Then** the original owner no longer sees the ticket as an active owned ticket
**And** the new owner can access the ticket through their owned-ticket experience

**Given** a transfer is no longer valid because it expired, was cancelled, was already accepted, or otherwise became unavailable
**When** the recipient attempts to accept it
**Then** the product blocks acceptance
**And** it provides a clear explanation of why the transfer can no longer be completed

**Given** the recipient is not authenticated when they try to accept a transfer
**When** the product requires account-bound ownership acceptance
**Then** the recipient is prompted to sign in or register
**And** the transfer context is preserved so they can continue the acceptance flow after authentication

**Given** ownership changes after a successful transfer
**When** the new owner views the transferred ticket
**Then** the product reflects the latest ticket state in their account
**And** the old owner is not shown contradictory active ownership information

**Given** the transfer acceptance flow is used on a mobile device
**When** the recipient completes or attempts acceptance
**Then** the acceptance action, confirmation, and resulting ownership state are readable and operable on a small screen
**And** the user is not left uncertain about whether they now own the ticket

**Given** the product cannot complete the transfer acceptance because of a temporary system or network issue
**When** the recipient submits acceptance
**Then** the product shows a clear failure or retry state
**And** it avoids implying that ownership changed if the outcome cannot be confirmed

### Story 4.3: Resale Listing and Resale State Visibility

As an attendee who owns a ticket,
I want to list an eligible ticket for resale and understand its resale state,
So that I can use the organizer-controlled resale path without confusion about availability or ownership.

**Implements:** FR27, FR28, FR29, FR30; NFR12; UX-DR3, UX-DR4

**Acceptance Criteria:**

**Given** an authenticated attendee is viewing a ticket they currently own
**When** that ticket is eligible for resale under the event's rules
**Then** the product presents resale as an available action
**And** the attendee can begin the resale listing flow from the owned-ticket experience

**Given** the attendee starts a resale listing for an eligible ticket
**When** the resale request is submitted successfully
**Then** the product reflects that the ticket is now resale listed
**And** the attendee receives clear confirmation of the new resale state

**Given** a ticket is not eligible for resale because of policy, timing, pricing constraints, state, or ownership conditions
**When** the attendee attempts to list it
**Then** the product blocks the resale action
**And** it provides a clear explanation of why resale is not currently allowed

**Given** the attendee is creating a resale listing
**When** the resale flow is displayed
**Then** the product communicates the applicable organizer-controlled resale rules clearly
**And** the attendee can understand the effect of listing the ticket before confirming the action

**Given** a ticket is already resale listed or otherwise unavailable for a new resale action
**When** the attendee attempts to create another resale listing
**Then** the product prevents contradictory resale actions
**And** the current resale-related state remains understandable

**Given** a ticket is currently resale listed
**When** the attendee views the owned-ticket list or ticket detail
**Then** the resale-listed state is visible and distinguishable from active, transfer pending, used, or unavailable states
**And** the attendee can understand that the ticket is in a resale workflow

**Given** a resale state changes because of listing creation, listing removal, sale completion, or another lifecycle event
**When** the attendee opens or refreshes the relevant ticket view
**Then** the product reflects the latest available resale state from the system
**And** outdated state is not shown as current truth

**Given** the resale flow is used on a mobile device
**When** the attendee creates or reviews a resale listing
**Then** the listing action, resale state, and rule explanations remain readable and usable on a small screen
**And** the attendee is not forced to infer the meaning of the resale state

**Given** the product cannot create or refresh the resale listing state because of a temporary system or network issue
**When** the attendee attempts the resale action
**Then** the product shows a clear failure or retry state
**And** it does not leave the attendee uncertain about whether the listing was actually created

## Epic 5: Organizer Event and Staff Operations

Organizers can create and manage events, configure ticket types and resale rules, and manage event staff access.

### Story 5.1: Organizer Event Creation

As an organizer,
I want to create a new event,
So that I can begin configuring and operating ticket sales and entry for that event through the platform.

**Implements:** FR31; NFR20; UX-DR7

**Acceptance Criteria:**

**Given** an authenticated user has organizer-authorized access
**When** they open the event creation flow
**Then** the product presents an event creation form with the required event fields
**And** the organizer can begin creating an event without encountering unrelated setup complexity

**Given** the organizer provides valid event details
**When** they submit the event creation form
**Then** a new event is created successfully
**And** the organizer receives clear confirmation that the event now exists in the platform

**Given** an event is created successfully
**When** the creation flow completes
**Then** the organizer is taken to an appropriate next step for continuing event setup
**And** the product reinforces that the event is ready for further configuration rather than fully complete by default

**Given** the organizer submits incomplete or invalid event information
**When** the product validates the form
**Then** the organizer receives clear field-level or form-level error feedback
**And** the product explains what must be corrected before the event can be created

**Given** a non-organizer or unauthorized user attempts to access event creation
**When** the product evaluates their access
**Then** the creation flow is blocked
**And** the product returns a clear unauthorized-access outcome without exposing organizer-only controls

**Given** the organizer is creating an event on a mobile device or a larger screen
**When** the event creation flow is rendered
**Then** the form remains readable and usable at the supported breakpoint
**And** the primary event fields and next action remain clear without excessive clutter

**Given** the product cannot create the event because of a temporary system or network issue
**When** the organizer submits the form
**Then** the product shows a clear failure or retry state
**And** it does not leave the organizer uncertain about whether the event was actually created

### Story 5.2: Organizer Event Editing and Ticket Type Management

As an organizer,
I want to edit event details and manage ticket types,
So that I can control how the event is presented and sold after creation.

**Implements:** FR32, FR33, FR34; NFR20; UX-DR7

**Acceptance Criteria:**

**Given** an organizer has access to an event they manage
**When** they open the event management area
**Then** the product allows them to view and edit the event's core details
**And** the current event information is shown clearly enough to support confident updates

**Given** the organizer submits valid changes to an event
**When** the event update is processed successfully
**Then** the product saves the updated event details
**And** the organizer receives clear confirmation that the event was updated

**Given** the organizer needs to define how tickets are sold for an event
**When** they open ticket-type management
**Then** the product allows them to create ticket types for that event
**And** each ticket type can include the relevant sale information needed for attendee purchase

**Given** one or more ticket types already exist for an event
**When** the organizer views ticket-type management
**Then** the product displays the configured ticket types
**And** the organizer can update ticket-type details, pricing, and availability-related information

**Given** the organizer submits invalid event or ticket-type changes
**When** the product validates the update
**Then** the organizer receives clear feedback about what must be corrected
**And** invalid changes are not presented as successfully saved

**Given** a user without organizer access attempts to edit event details or ticket types
**When** the product evaluates access to those controls
**Then** the management actions are blocked
**And** the product returns a clear unauthorized-access outcome without exposing protected editing functionality

**Given** the organizer is using the event and ticket-type management flow on mobile or desktop
**When** the management interface is rendered
**Then** the workflow remains usable at supported breakpoints
**And** the product preserves operational clarity instead of collapsing into generic dashboard clutter

**Given** the product cannot save event or ticket-type changes because of a temporary system or network issue
**When** the organizer attempts to submit the update
**Then** the product shows a clear failure or retry state
**And** it avoids leaving the organizer uncertain about whether the change actually took effect

### Story 5.3: Organizer Resale Rule Management

As an organizer,
I want to define and update resale rules for my event,
So that ticket resale happens within the boundaries I control rather than through unmanaged informal channels.

**Implements:** FR35; NFR20; UX-DR7

**Acceptance Criteria:**

**Given** an organizer has access to an event they manage
**When** they open the resale settings area
**Then** the product allows them to view the current resale policy for that event
**And** the organizer can understand whether resale is enabled, restricted, or unavailable

**Given** the organizer wants to configure resale behavior
**When** they submit valid resale rule settings
**Then** the product saves the updated resale policy for the event
**And** the organizer receives clear confirmation that the new rules are now in effect

**Given** the organizer is editing resale rules
**When** the resale settings interface is shown
**Then** the product communicates the meaning of the available resale controls clearly
**And** the organizer can understand how those rules will affect attendee resale eligibility

**Given** the organizer submits invalid or contradictory resale rules
**When** the product validates the settings
**Then** the product blocks the invalid update
**And** it provides clear feedback about what must be corrected before the rules can be saved

**Given** resale rules affect attendee actions after publication
**When** those rules are updated successfully
**Then** the product reflects the latest resale policy in future attendee resale decisions
**And** the organizer can trust that the event's resale path is governed by the updated rules

**Given** a non-organizer or unauthorized user attempts to access resale rule management
**When** the product evaluates access
**Then** the resale settings controls are blocked
**And** the product returns a clear unauthorized-access outcome without exposing organizer-only configuration details

**Given** the organizer uses resale rule management on mobile or desktop
**When** the settings interface is rendered
**Then** the controls and explanatory context remain readable and usable at supported breakpoints
**And** the workflow does not require the organizer to infer policy behavior from unclear labels

**Given** the product cannot save resale rule changes because of a temporary system or network issue
**When** the organizer submits the update
**Then** the product shows a clear failure or retry state
**And** it does not leave the organizer uncertain about whether the resale policy actually changed

### Story 5.4: Staff Invitation, Acceptance, and Role Management

As an organizer,
I want to invite staff, manage their roles, and support invitation acceptance,
So that the right people can access event operations with the correct permissions.

**Implements:** FR4, FR5, FR6; NFR5, NFR20

**Acceptance Criteria:**

**Given** an organizer has access to an event they manage
**When** they open the staff management area
**Then** the product displays the current staff members and their roles for that event
**And** the organizer can distinguish accepted staff access from pending invitation states

**Given** the organizer wants to add staff to an event
**When** they submit a valid staff invitation
**Then** the product creates the invitation successfully
**And** the organizer receives clear confirmation that the invited person can now accept access through the platform

**Given** an invited staff member accesses the invitation flow as an authenticated user
**When** they accept the invitation successfully
**Then** the product grants them event access according to the assigned role
**And** their staff state is reflected as accepted rather than pending

**Given** the organizer needs to change staff permissions for an event
**When** they update a staff member's role successfully
**Then** the product saves the updated role
**And** future event access reflects the new permission level

**Given** an invitation or role change is invalid, duplicated, or no longer applicable
**When** the organizer or invited user submits the action
**Then** the product blocks the invalid action
**And** it provides clear feedback about why the request cannot be completed

**Given** a non-organizer or unauthorized user attempts to access staff invitation or role-management controls
**When** the product evaluates access
**Then** those controls are blocked
**And** the product does not expose organizer-only staff management functionality

**Given** the staff management flow is used on mobile or desktop
**When** the interface is rendered
**Then** invitation state, role information, and primary management actions remain readable and usable at supported breakpoints
**And** the product preserves operational clarity for organizer decisions

**Given** the product cannot create an invitation, accept an invitation, or save a role change because of a temporary system or network issue
**When** the affected user submits the action
**Then** the product shows a clear failure or retry state
**And** it does not leave staff access in an ambiguous state

### Story 5.5: Event Operational Readiness View

As an organizer,
I want to review whether my event is operationally ready,
So that I can confirm the event setup, ticket configuration, and staff access are in place before entry begins.

**Implements:** FR36; NFR20; UX-DR7

**Acceptance Criteria:**

**Given** an organizer has access to an event they manage
**When** they open the event readiness view
**Then** the product presents a consolidated view of the event's operational setup
**And** the organizer can review readiness without navigating through every configuration area separately

**Given** the event has core setup elements such as event details, ticket types, resale policy, and staff assignments
**When** the organizer views readiness status
**Then** the product reflects whether those setup areas are configured or incomplete
**And** the organizer can identify the next missing or incomplete setup area clearly

**Given** the event is not yet fully prepared for live operation
**When** the organizer views the readiness screen
**Then** the product highlights the incomplete areas that may affect event operations
**And** it helps the organizer understand what still needs attention before entry begins

**Given** the event is sufficiently configured for launch and entry operations
**When** the organizer views readiness status
**Then** the product communicates that the event is ready for the next operational stage
**And** the organizer can proceed with greater confidence in the setup

**Given** underlying event, ticket, resale, or staff configuration changes
**When** the organizer opens or refreshes the readiness view
**Then** the readiness information reflects the latest available event state
**And** outdated readiness conclusions are not presented as current truth

**Given** the organizer uses the readiness view on mobile or desktop
**When** the screen is rendered
**Then** the readiness summary and any incomplete-area indicators remain readable and actionable at supported breakpoints
**And** the view preserves clarity rather than turning into dashboard clutter

**Given** the product cannot retrieve readiness information because of a temporary system or network issue
**When** the organizer opens the readiness view
**Then** the product shows a clear failure or retry state
**And** it avoids implying that the event is ready or incomplete when current truth cannot be confirmed

## Epic 6: Scanner Validation and Entry Operations

Scanner staff can access event scanning, validate tickets, receive clear outcomes, and operate reliably in live entry conditions.

### Story 6.1: Scanner Access and Event Entry Setup

As scanner staff,
I want to access the scanner area for an assigned event and load the event validation context,
So that I can begin ticket scanning with the correct event data and permissions.

**Implements:** FR37, FR38; NFR20; UX-DR5

**Acceptance Criteria:**

**Given** an authenticated user has scanner-authorized access for a specific event
**When** they enter the scanner area
**Then** the product directs them to the scanner experience for that event
**And** the product reflects that they are operating within the correct event context

**Given** scanner staff have access to one or more assigned events
**When** they open the scanner entry flow
**Then** the product allows them to enter the correct event scanning context
**And** the selected event is clearly identified before live validation begins

**Given** the scanner experience requires event-specific validation data
**When** scanner staff open the event scanning area
**Then** the product retrieves the event-specific scanning context needed for validation
**And** the scanner user is informed when the scanning context is ready to use

**Given** a user lacks valid scanner authorization for an event
**When** they attempt to access that event's scanner flow
**Then** the product blocks access
**And** it presents a clear unauthorized or unavailable outcome without exposing scanner-only functionality

**Given** scanner staff open the scanner flow on a mobile device in a live-event setting
**When** the scanning area is rendered
**Then** the entry setup and event context are readable and operable on a small screen
**And** the interface prioritizes speed and clarity over nonessential detail

**Given** the product cannot load the scanner event context because of a temporary system or network issue
**When** scanner staff try to enter the scanner area
**Then** the product shows a clear loading failure or retry state
**And** the user is not misled into believing validation is ready when required context is missing

**Given** scanner access is established successfully
**When** the setup state completes
**Then** the product presents a clear path into live ticket validation
**And** the scanner user does not need to navigate through unrelated screens before scanning begins

### Story 6.2: Live Ticket Validation and Scan Outcomes

As scanner staff,
I want to validate a presented ticket and receive an immediate outcome,
So that I can make a confident entry decision without slowing the line.

**Implements:** FR39, FR40, FR41, FR42, FR45, FR50; NFR3, NFR12, NFR17; UX-DR5, UX-DR10

**Acceptance Criteria:**

**Given** scanner staff are in a valid event scanning context
**When** they scan or submit a presented ticket for validation
**Then** the product sends the ticket for event-specific validation
**And** the scanner flow evaluates the ticket against the latest available ticket state

**Given** the presented ticket is valid and eligible for entry
**When** validation completes successfully
**Then** the product returns a clear valid outcome
**And** the result is visually distinct enough that the scanner can act without hesitation

**Given** the presented ticket has already been used, is invalid, or is otherwise not eligible for entry
**When** validation completes
**Then** the product returns the appropriate non-valid outcome
**And** the scanner can distinguish between valid, already used, invalid, and otherwise ineligible states clearly

**Given** the validation result indicates a non-valid state
**When** the scanner views the result
**Then** the product provides enough contextual meaning for the scanner to understand why entry should not proceed
**And** the result does not rely on color alone to communicate meaning

**Given** the same event is being scanned in a live-entry context
**When** the scanner validates tickets in sequence
**Then** the product keeps each scan outcome isolated to the presented ticket
**And** the scanner can move cleanly from one validation attempt to the next

**Given** the ticket state changes in the system because of prior use, ownership change, or another lifecycle event
**When** a scanner submits the ticket for validation
**Then** the product reflects the latest available event ticket state in the returned outcome
**And** stale ticket truth is not presented as current validation status

**Given** the validation flow is used on a mobile device under event conditions
**When** the scan outcome is rendered
**Then** the outcome is readable, high-contrast, and immediately understandable on a small screen
**And** the scanner can continue operating without navigating through unnecessary interface layers

**Given** the product cannot complete live validation because of a temporary system or network issue
**When** the scanner submits a ticket
**Then** the product shows a clear failure or retry state
**And** it does not imply that a ticket is valid or invalid when current truth cannot be confirmed

### Story 6.3: Degraded Connectivity and Scanner Recovery

As scanner staff,
I want the scanner flow to behave predictably during poor connectivity and recovery,
So that I can continue operating with as much confidence as possible when live validation conditions are degraded.

**Implements:** FR43; NFR4, NFR11, NFR13, NFR14, NFR15; UX-DR5, UX-DR10

**Acceptance Criteria:**

**Given** scanner staff are operating in an event context with degraded or unstable connectivity
**When** the scanner can no longer rely on normal live validation
**Then** the product communicates that the scanner is in a degraded or limited operating mode
**And** the scanner user is not misled into believing full live confirmation is still available

**Given** scanner staff have access to previously prepared event scanning context
**When** connectivity degrades during operation
**Then** the product can continue to support the limited scanner workflow allowed by the system's degraded-mode rules
**And** the scanner user can understand that degraded operation has different confidence boundaries than normal online validation

**Given** scanner staff attempt validation while connectivity is degraded
**When** the product returns a degraded-mode outcome or limitation
**Then** the scanner user receives a clear explanation of the current operating condition
**And** the product preserves high-clarity result communication even when confidence is reduced

**Given** the scanner cannot validate a ticket confidently because required live state is unavailable
**When** the user submits the ticket
**Then** the product shows a clear unavailable, retry, or limited-confidence state
**And** it avoids presenting a false valid or invalid conclusion beyond what the current mode supports

**Given** connectivity is restored after a degraded period
**When** the scanner flow recovers
**Then** the product returns to normal live-validation behavior
**And** the scanner user is informed that current truth can now be confirmed again

**Given** validation attempts occurred during degraded operation
**When** the product regains the ability to reconcile scanner activity
**Then** the scanner workflow supports recovery or synchronization behavior consistent with the system's event-validation model
**And** the scanner user is not left uncertain about whether the system recovered cleanly

**Given** degraded-mode or recovery behavior is shown on a mobile device in a live event setting
**When** the scanner views the scanner state
**Then** the current mode, limitation, and next action remain readable and actionable on a small screen
**And** the interface continues to prioritize operational clarity under pressure

## Epic 7: Operational Visibility and Incident Handling

Organizers and scanner staff can understand ticket issues, review important state changes, and troubleshoot entry problems with sufficient visibility.

### Story 7.1: Ticket Issue Visibility for Staff and Organizers

As organizer staff or scanner staff,
I want to understand why a ticket cannot currently be used,
So that I can respond to entry issues without relying on guesswork or informal explanations.

**Implements:** FR44, FR47; NFR17; UX-DR3, UX-DR5, UX-DR10

**Acceptance Criteria:**

**Given** a scanner or organizer is viewing a ticket-related issue during event operations
**When** the product presents the current ticket state
**Then** it provides enough visibility to understand whether the issue is related to ownership, prior usage, transfer, resale, or another ticket-state condition
**And** the user can distinguish between those issue types without relying on vague status labels

**Given** a ticket is not currently valid for normal entry
**When** the scanner or organizer views the ticket issue state
**Then** the product communicates why the ticket cannot currently be used
**And** the explanation is clear enough to support an operational decision at the venue

**Given** a scanner receives a non-valid scan outcome during live validation
**When** the result is shown
**Then** the product exposes enough contextual meaning for the scanner to understand the nature of the problem
**And** the outcome remains readable and actionable under live entry conditions

**Given** an organizer reviews a ticket issue outside the immediate scanner flow
**When** they open the relevant ticket or operational context
**Then** the product presents enough current-state information to help them interpret the incident
**And** the organizer does not need to rely on hidden internal system knowledge to understand the issue

**Given** a user without the necessary operational access attempts to view ticket issue details
**When** the product evaluates their permissions
**Then** access to that operational visibility is restricted appropriately
**And** protected ticket information is not exposed beyond the user's role

**Given** ticket issue visibility is used on a mobile device in a live event setting
**When** the issue state is rendered
**Then** the explanation, current status, and next relevant context remain readable and understandable on a small screen
**And** the interface does not collapse into ambiguous or low-signal messaging

**Given** the product cannot retrieve the current ticket issue context because of a temporary system or network issue
**When** the scanner or organizer attempts to view the issue
**Then** the product shows a clear failure or retry state
**And** it does not imply a confirmed issue explanation when current truth cannot be retrieved

### Story 7.2: Audit and Incident Review Context

As organizer staff or scanner staff,
I want to review important ticket-state and scan-related history,
So that I can understand what happened during an incident and make informed follow-up decisions.

**Implements:** FR46, FR47; NFR9; UX-DR3

**Acceptance Criteria:**

**Given** an organizer or authorized staff member is reviewing a ticket-related incident
**When** they open the incident or ticket context
**Then** the product provides access to relevant ticket-state and scan-related history
**And** the user can understand that the history reflects important prior actions rather than only the current state

**Given** a ticket has undergone important lifecycle changes such as purchase confirmation, transfer, resale, or scan usage
**When** the authorized user reviews the ticket history
**Then** the product shows enough audit context to understand that those changes occurred
**And** the user can distinguish major state changes from one another clearly

**Given** a ticket issue occurred at entry
**When** an organizer or staff member reviews the related context
**Then** the product provides enough historical visibility to help explain the incident
**And** the user can connect the current problem to prior scan or ownership events where relevant

**Given** scan-related activity exists for a ticket
**When** the authorized user reviews the audit context
**Then** the product presents enough scan history to support operational understanding
**And** the history does not require the user to infer what happened from incomplete or ambiguous records

**Given** a user without the required operational permissions attempts to access audit or incident history
**When** the product evaluates access
**Then** the audit context is restricted appropriately
**And** protected ticket or scan history is not exposed beyond the user's role

**Given** audit and incident review is used on a mobile device or larger screen
**When** the product presents the historical context
**Then** the information remains readable and understandable at supported breakpoints
**And** the interface preserves clarity rather than overwhelming the user with low-priority detail

**Given** the product cannot retrieve audit or incident history because of a temporary system or network issue
**When** the authorized user attempts to review it
**Then** the product shows a clear failure or retry state
**And** it does not imply that the displayed historical context is complete when retrieval could not be confirmed
