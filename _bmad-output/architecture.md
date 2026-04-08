---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]
inputDocuments:
  - "chat://private-event-smart-ticketing-project-brief"
workflowType: "architecture"
project_name: "Private Event Smart Ticketing Platform"
user_name: "Arnoldekechi"
date: "2026-04-08"
lastStep: 8
status: "complete"
completedAt: "2026-04-08"
---

# Architecture Decision Document

## Project Context Analysis

### Requirements Overview

**Functional Requirements**

The MVP must support event creation, ticket type configuration, checkout, ticket issuance, QR-based entry validation, ticket transfer, and organizer-controlled resale. There are three distinct operator journeys with different needs:

- Organizers need event setup, ticket inventory control, resale policy control, and attendance visibility.
- Attendees need low-friction purchase, clear ticket ownership, and trusted transfer flows.
- Door staff need fast scanning with immediate valid/used/invalid feedback under pressure.

**Non-Functional Requirements**

- Mobile-first UX is mandatory for buyers, ticket holders, and scanners.
- Scan latency must be low enough for busy door operations.
- Fraud resistance must address duplicate use, screenshots, resale abuse, and transfer misuse.
- The system must work for events of roughly 500 to 1000 attendees initially.
- Entry validation must tolerate low-connectivity environments.

**Scale & Complexity**

- Primary domain: event commerce plus controlled access validation.
- Complexity level: medium.
- Estimated architectural components: 10 to 14 bounded modules across user, event, commerce, ticketing, transfer/resale, scanning, and notification concerns.

### Technical Constraints & Dependencies

- Payment processing is required for ticket purchase and resale settlement.
- QR validation must work in both normal online mode and a degraded low-connectivity mode.
- Ticket ownership must be identity-bound, which means authentication is a core platform concern rather than an optional add-on.
- The solution should remain operationally simple for an MVP and avoid premature microservices.

### Cross-Cutting Concerns Identified

- Authentication and authorization
- Fraud prevention and auditability
- Idempotency for checkout, transfer, resale, and scan operations
- Real-time or near-real-time ticket state updates
- Offline/degraded scanner behavior
- Observability and operational support during live events

## Core Architectural Decisions

### Decision Priority Analysis

**Critical Decisions**

- Use a modular monolith for MVP, not microservices.
- Separate attendee/organizer experiences from the ticket-validation API boundary, but keep them in one deployable platform.
- Make ticket ownership state authoritative on the server.
- Use signed QR payloads plus server-side consumption tracking.
- Support degraded offline scanning with explicit guardrails.

**Important Decisions**

- Use a PWA-capable web frontend instead of separate native apps for V1.
- Use PostgreSQL as the system of record.
- Use Redis for short-lived state, idempotency, rate limiting, and scan hot paths.
- Use asynchronous jobs for email, notifications, settlement tasks, and reconciliation.

**Deferred Decisions**

- Marketplace-style open resale
- Dynamic pricing
- Loyalty/rewards
- Blockchain or NFT integration
- Advanced analytics warehouse

### Recommended System Style

The recommended architecture is a **mobile-first modular monolith** with:

- `Web App`: Next.js PWA for attendees, organizers, and scanner UI
- `Application API`: NestJS backend exposing REST endpoints and webhook handlers
- `Primary Database`: PostgreSQL
- `Fast State Layer`: Redis
- `Background Jobs`: queue workers for email, payouts, and reconciliation
- `File/Object Storage`: event images and generated exports
- `Payments`: Stripe or equivalent PSP

This is the right trade-off for the brief because it keeps the stack operationally simple while still separating concerns clearly enough for future extraction if scale grows.

### Architecture Overview

```text
Mobile Browser / PWA
  -> Next.js App
      -> NestJS API
          -> PostgreSQL
          -> Redis
          -> Queue Workers
          -> Payment Provider
          -> Email/SMS Provider
```

### Key Domain Decisions

#### 1. Identity-Bound Ticket Ownership

Each ticket belongs to exactly one platform account at any point in time. Ownership changes only through approved platform workflows:

- initial purchase assignment
- transfer acceptance
- organizer-approved resale flow

Raw QR possession is never treated as proof of ownership.

#### 2. Ticket as a Stateful Asset

Each ticket moves through a controlled state machine:

- `reserved`
- `paid`
- `issued`
- `transfer_pending`
- `resale_listed`
- `used`
- `cancelled`
- `refunded`

This gives the platform a single source of truth for all anti-fraud checks.

#### 3. QR Validation Strategy

Each issued ticket has a signed QR payload containing:

- ticket identifier
- event identifier
- ownership revision/version
- issued-at timestamp
- short checksum or nonce

The QR itself is not the source of truth; it is a signed pointer to server-owned state. A screenshot can reproduce the code visually, but only the first valid consumption is accepted by the system.

#### 4. Anti-Fraud Posture

Fraud prevention is layered:

- signed QR payloads to prevent forgery
- server-side consumed-state checks to stop duplicate entry
- ownership revision invalidation on transfer/resale so old QR renders fail
- account-bound display of live ticket view
- scan audit trail with device, time, and operator attribution
- rate limiting and anomaly detection on repeated invalid scans

### Offline / Low-Connectivity Validation Decision

The scanner must support a degraded mode, but the trade-off must be explicit:

- `Online mode` is the default and supports multiple scanner devices with immediate duplicate protection.
- `Low-connectivity mode` uses a pre-synced event manifest stored on the scanner device in IndexedDB.
- In low-connectivity mode, the scanner validates QR signature locally and checks local consumed-state.
- Scan events are queued locally and synced when connectivity returns.

**Architectural constraint:** for MVP, true multi-device offline conflict resolution is not guaranteed. If multiple devices are fully offline at the same time, duplicate-entry risk increases. Operationally, the recommended policy is:

- online for normal multi-lane entry
- degraded offline mode for a single active scanner lane when connectivity is poor

This is a pragmatic MVP boundary that preserves simplicity while still addressing the brief's low-connectivity requirement.

## Data Architecture

### Core Entities

- `User`
- `UserProfile`
- `Event`
- `TicketType`
- `Order`
- `OrderItem`
- `Ticket`
- `TicketOwnershipHistory`
- `TransferRequest`
- `ResaleListing`
- `ScanSession`
- `ScanAttempt`
- `StaffMembership`
- `PayoutRecord`
- `WebhookEvent`

### Core Relational Model

```text
User 1---* Order
User 1---* Ticket (current_owner_id)
Event 1---* TicketType
Event 1---* StaffMembership
Order 1---* Ticket
Ticket 1---* TicketOwnershipHistory
Ticket 1---* TransferRequest
Ticket 1---* ResaleListing
Ticket 1---* ScanAttempt
Event 1---* ScanSession
```

### Data Ownership Rules

- PostgreSQL is authoritative for all business state.
- Redis is non-authoritative and may be rebuilt from PostgreSQL.
- Ticket state transitions happen in transactional application services.
- Scan outcomes are written append-only to preserve auditability.

## API and Module Boundaries

### Backend Modules

- `auth`
- `users`
- `events`
- `ticket-types`
- `checkout`
- `orders`
- `tickets`
- `transfers`
- `resales`
- `scanner`
- `staff`
- `payments`
- `notifications`
- `reporting`
- `audit`

### External API Surface

Primary REST endpoints should include:

- `/auth/*`
- `/events`
- `/events/{eventId}/ticket-types`
- `/checkout/sessions`
- `/orders/{orderId}`
- `/tickets/me`
- `/tickets/{ticketId}/transfer`
- `/tickets/{ticketId}/accept-transfer`
- `/tickets/{ticketId}/resale`
- `/scanner/events/{eventId}/validate`
- `/scanner/events/{eventId}/manifest`
- `/scanner/events/{eventId}/sync`

### Backend Interaction Rules

- Controllers remain thin.
- Business rules live in application services.
- Repositories own database access.
- Cross-module writes happen through explicit service interfaces, not direct repository reach-through.
- Scan validation paths must be optimized and isolated from slower organizer workflows.

## Purchase, Transfer, Resale, and Scan Flows

### Purchase Flow

1. Buyer starts checkout.
2. Inventory is soft-reserved for a short TTL.
3. Payment provider session is created.
4. Payment webhook confirms success.
5. Order is marked paid and tickets are issued.
6. Signed QR payloads are generated from current ownership revision.

### Transfer Flow

1. Current owner creates transfer request.
2. Ticket becomes `transfer_pending`.
3. Recipient accepts using platform account.
4. Ownership updates transactionally.
5. Ownership revision increments.
6. Previous QR is invalidated and new QR is issued.

### Controlled Resale Flow

1. Organizer policy is checked.
2. Ticket is listed within configured constraints.
3. Buyer purchases listing through platform checkout.
4. Ownership transfers only after payment success.
5. Sale price cap and resale window are enforced by policy service.

### Scan Flow

1. Door staff authenticates into scanner mode.
2. Scanner submits QR payload plus device/session metadata.
3. API verifies signature, event match, ownership revision, and ticket state.
4. If valid and unused, ticket is atomically marked used.
5. Response returns `valid`, `already_used`, or `invalid`.
6. Every attempt is logged for audit and incident review.

## Security Architecture

### Authentication and Authorization

- Attendees authenticate with passwordless email link or OTP-first flow for low friction.
- Organizers and staff use stronger session controls and optional MFA.
- Role-based access control covers attendee, organizer, and scanner/staff permissions.

### Security Controls

- Signed QR payloads using rotating signing keys managed server-side
- Short session lifetimes for scanner devices
- Secure HTTP-only cookies for web sessions
- Idempotency keys for payment and critical mutation endpoints
- Audit logging for ownership changes and scans
- Rate limiting on auth, checkout, transfer, and scanner endpoints

## Reliability, Performance, and Operations

### Performance Targets

- Ticket validation API should return in low hundreds of milliseconds under normal event load.
- The platform should comfortably support events up to 1000 attendees for MVP.
- Hot scan-path reads should be cached where safe, but write decisions remain authoritative in PostgreSQL transactions.

### Reliability Patterns

- Payment webhooks processed idempotently
- Outbox or queued-event pattern for downstream notifications
- Retry-safe workers for email and settlement jobs
- Append-only audit trail for operational recovery

### Observability

- Structured logs with correlation IDs
- Metrics for scan latency, scan success rate, duplicate attempts, checkout conversion, transfer completion, and webhook failures
- Event-day operational dashboard focused on queue health and scanner health

## Implementation Patterns & Consistency Rules

### Naming Standards

- Database tables: plural snake_case
- Database columns: snake_case
- JSON API fields: camelCase
- REST endpoints: plural nouns
- TypeScript files: kebab-case except React components, which use PascalCase filenames
- Event names: dot-separated past tense, for example `ticket.transferred`

### API Format Standards

Success response envelope:

```json
{
  "data": {},
  "meta": {}
}
```

Error response envelope:

```json
{
  "error": {
    "code": "ticket_already_used",
    "message": "Ticket has already been used",
    "details": {}
  }
}
```

### Process Standards

- Dates in APIs use ISO 8601 UTC strings.
- Ownership changes must be transactional.
- Critical state mutations must emit audit records.
- All write endpoints support idempotency where duplicate client retries are likely.
- Scanner operations must log device ID, session ID, and operator ID when available.

## Project Structure & Boundaries

### Recommended Repository Layout

```text
ticketsystem/
├── README.md
├── package.json
├── pnpm-workspace.yaml
├── apps/
│   ├── web/
│   │   ├── src/
│   │   │   ├── app/
│   │   │   ├── features/
│   │   │   ├── components/
│   │   │   ├── lib/
│   │   │   └── styles/
│   │   └── public/
│   └── api/
│       ├── src/
│       │   ├── main.ts
│       │   ├── config/
│       │   ├── modules/
│       │   ├── common/
│       │   └── jobs/
├── packages/
│   ├── shared-types/
│   ├── shared-validation/
│   ├── shared-config/
│   └── qr/
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── tests/
│   ├── integration/
│   ├── e2e/
│   └── fixtures/
├── docs/
└── _bmad-output/
    └── architecture.md
```

### Requirement-to-Module Mapping

- Event creation and ticket types -> `events`, `ticket-types`
- Ticket purchase -> `checkout`, `orders`, `payments`
- Secure ownership -> `tickets`, `audit`, `auth`
- Transfer -> `transfers`, `notifications`
- Controlled resale -> `resales`, `payments`, `tickets`
- Entry validation -> `scanner`, `staff`, `audit`

## Architecture Validation Results

### Coherence Validation

The recommended stack is coherent for an MVP:

- The modular monolith keeps business rules centralized.
- The PWA approach matches the mobile-first requirement.
- PostgreSQL plus Redis supports both transactional integrity and fast scan paths.
- The scanner design matches the fraud-prevention priority without requiring native apps.

### Requirements Coverage Validation

All MVP requirements from the brief are covered:

- event setup and ticket types
- purchase and ticket issuance
- secure ownership and QR validation
- transfer flow
- organizer-controlled resale
- door staff scanning
- low-connectivity operational mode

### Non-Functional Coverage

- Fraud prevention is handled through signed payloads, ownership revisioning, and auditability.
- Scan speed is handled through optimized validation endpoints and Redis-backed hot paths.
- Low-connectivity operation is supported with a degraded manifest-sync mode.
- Mobile-first access is handled through the web/PWA delivery model.

### Gap Analysis

Open design items that should be resolved before implementation begins:

- choose payment provider and payout model
- choose auth provider versus custom auth
- define exact ticket-holder identity verification level
- decide whether resale settlement is wallet-based or direct payout-based
- define scanner-device operational policy for poor-connectivity events

None of these block the MVP architecture, but they should be settled before build kickoff.

## Recommended Build Sequence

1. Stand up auth, users, events, ticket types, and ticket issuance.
2. Implement checkout plus payment webhook finalization.
3. Implement ticket wallet and signed QR generation.
4. Implement scanner API and scanner PWA flow.
5. Add transfer workflow.
6. Add controlled resale workflow.
7. Add operations dashboard, audit views, and reconciliation jobs.

## Final Recommendation

Build V1 as a **TypeScript monorepo modular monolith**:

- `Next.js PWA` for attendee, organizer, and scanner experiences
- `NestJS API` for domain logic and integrations
- `PostgreSQL` as source of truth
- `Redis` for hot-path support and resilience

This gives you the simplest architecture that still properly respects the core product promise: trusted ownership, controlled transfer/resale, and reliable entry validation for private events.
