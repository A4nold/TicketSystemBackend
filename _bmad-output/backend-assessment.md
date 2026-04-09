# Backend Assessment

This document is a BMAD-style assessment of the existing backend implementation.
It is intended to capture:

- what already exists
- what is working well
- what architectural gaps remain
- what should be prioritized next

The assessment is based on the current codebase rather than an idealized spec.

## 1. Current Backend Scope

The backend is already beyond a trivial MVP. It contains working foundations for:

- JWT-based authentication
- user registration and login
- event creation and editing
- ticket-type creation and editing
- event staff invitation and role assignment
- checkout order creation
- Stripe checkout session creation
- Stripe webhook ingestion
- ticket issuance
- owned-ticket access
- QR token generation
- transfer lifecycle
- resale lifecycle
- scanner manifest, validation, and sync
- audit-oriented ticket ownership history

Primary modules currently present:

- [auth](/Users/arnoldekechi/RiderProjects/ticketsystem/src/auth)
- [events](/Users/arnoldekechi/RiderProjects/ticketsystem/src/events)
- [orders](/Users/arnoldekechi/RiderProjects/ticketsystem/src/orders)
- [payments](/Users/arnoldekechi/RiderProjects/ticketsystem/src/payments)
- [tickets](/Users/arnoldekechi/RiderProjects/ticketsystem/src/tickets)
- [transfers](/Users/arnoldekechi/RiderProjects/ticketsystem/src/transfers)
- [resale](/Users/arnoldekechi/RiderProjects/ticketsystem/src/resale)
- [scanner](/Users/arnoldekechi/RiderProjects/ticketsystem/src/scanner)
- [qr](/Users/arnoldekechi/RiderProjects/ticketsystem/src/qr)

Primary data model file:

- [schema.prisma](/Users/arnoldekechi/RiderProjects/ticketsystem/prisma/schema.prisma)

## 2. What Is Already Working Well

### Domain modeling

The Prisma schema is strong for the current product stage. It already models:

- users and profiles
- events and ticket types
- orders and order items
- issued tickets and ticket states
- transfer requests
- resale listings
- ownership history
- staff memberships
- scan sessions and scan attempts
- payout records
- webhook event storage

This is a real ticketing domain model, not a placeholder CRUD model.

### Auth foundation

The auth layer has a clean initial shape:

- register, login, and `me` endpoints in [auth.controller.ts](/Users/arnoldekechi/RiderProjects/ticketsystem/src/auth/auth.controller.ts)
- JWT issuance and validation in [auth.service.ts](/Users/arnoldekechi/RiderProjects/ticketsystem/src/auth/auth.service.ts)
- bearer token enforcement in [jwt-auth.guard.ts](/Users/arnoldekechi/RiderProjects/ticketsystem/src/auth/guards/jwt-auth.guard.ts)

For the current frontend stage, this is enough to support a working attendee auth flow.

### Event and operations foundation

The event module is already fairly complete for organizer workflows:

- public event listing and event-by-slug lookup
- event creation and editing
- ticket-type creation and update
- staff invitation, acceptance, update, and revoke

The service logic in [events.service.ts](/Users/arnoldekechi/RiderProjects/ticketsystem/src/events/events.service.ts) already enforces meaningful rules around ownership and staff role mutation.

### Scanner domain

The scanner module is one of the strongest areas of the backend.

You already have:

- JWT protection
- scanner membership enforcement
- manifest retrieval
- validation
- sync handling

The specialized scanner guard in [scanner-membership.guard.ts](/Users/arnoldekechi/RiderProjects/ticketsystem/src/auth/guards/scanner-membership.guard.ts) is a good sign that the codebase already understands event-scoped authorization, even though that pattern has not yet been generalized.

### Stripe foundation

Stripe is not just stubbed out. It already includes:

- checkout session creation in [payments.service.ts](/Users/arnoldekechi/RiderProjects/ticketsystem/src/payments/payments.service.ts)
- webhook signature verification
- webhook event persistence and duplicate protection
- order-paid transition handling
- ticket issuance from webhook completion
- cancellation handling for expired checkout sessions

This is a strong base to harden rather than something that needs to be invented from scratch.

## 3. Key Backend Gaps

## 3.1 Authorization Model Is Still Incomplete

This is the biggest gap.

Right now the backend has:

- JWT authentication
- scanner-specific membership authorization
- service-level organizer ownership checks in event operations

But it does not yet provide a reusable, explicit RBAC/capability layer for the whole product.

Current symptoms of that gap:

- there is no general `roles` or `capabilities` endpoint for the frontend
- organizer/admin/scanner access is not exposed in a frontend-friendly shape
- frontend role access is still being derived from demo email addresses in [role-access.ts](/Users/arnoldekechi/RiderProjects/ticketsystem/frontend/src/lib/auth/role-access.ts)
- authorization logic is distributed between guards and service methods rather than expressed through a consistent policy layer

Why this matters:

- the frontend cannot safely move beyond demo role routing until the backend becomes the source of truth
- future organizer/admin/scanner UI will become brittle if access rules remain implicit
- service-by-service permission logic becomes harder to audit as the product grows

## 3.2 Event-Scoped Roles Exist, But Platform RBAC Does Not

The schema supports event-scoped `StaffRole` values:

- `OWNER`
- `ADMIN`
- `SCANNER`

That is good, but the API still lacks:

- a normalized way to retrieve a user’s accepted memberships
- a way to ask “what surfaces can this user access?”
- a consistent rule set for owner vs admin vs scanner endpoints

At the moment:

- scanner is protected by a dedicated guard
- organizer-style actions often rely on `organizerId === user.id`

That is workable for now, but it is not the final model the frontend needs.

## 3.3 Stripe Needs Production Hardening

Stripe is implemented, but it still needs a hardening pass before it should be considered fully production-ready.

The code already handles:

- creating Stripe Checkout sessions
- webhook verification
- order payment completion
- duplicate webhook event persistence

The likely remaining gaps are:

- full end-to-end production validation against live or test Stripe
- stronger operational visibility for failed or partially processed webhooks
- cleaner retry/recovery procedures
- frontend success and cancel flow completion
- explicit reconciliation tooling for support/admin use
- clearer handling of delayed or out-of-order webhook delivery

This is not a greenfield Stripe integration. It is a solid implementation that now needs verification and operational maturity.

## 3.4 Seed Strategy Is Unsafe For Shared Environments

The current seed script in [seed.js](/Users/arnoldekechi/RiderProjects/ticketsystem/prisma/seed.js) clears existing data before recreating demo data.

That was acceptable for bootstrapping and demo setup, but it is dangerous in any shared or persistent environment.

This should be split into:

- a destructive reset/demo seed
- a safe additive seed for shared environments
- possibly targeted fixture commands for specific testing needs

## 3.5 Capability/Identity Response Is Too Thin For Frontend Expansion

The current `/auth/me` response is useful for identity, but thin for application routing.

Today it returns basic user info. It does not return:

- accepted staff memberships
- organizer-access event IDs
- scanner-access event IDs
- app surfaces/capabilities
- permission flags

That is why the frontend had to temporarily bridge access using seeded email heuristics.

## 3.6 Authorization Enforcement Is Not Yet Declarative

A mature next step would be to move from scattered service checks into a consistent authorization model such as:

- role decorators
- event membership decorators
- reusable guards
- policy helper services

This would make the backend easier to reason about and would reduce subtle permission drift over time.

## 4. Priority Recommendations

### Priority 1: Backend-Driven RBAC and Capabilities

This should be the next backend focus area.

Recommended deliverables:

- add a current-user capabilities endpoint, or extend `/auth/me`
- return accepted event memberships with roles
- return app-surface access in a frontend-friendly shape
- stop frontend role derivation by email
- add reusable authorization helpers for owner/admin/scanner decisions

Suggested output shape:

```json
{
  "id": "user_id",
  "email": "organizer@campusnight.ie",
  "status": "ACTIVE",
  "profile": {
    "firstName": "Maya",
    "lastName": "Okafor"
  },
  "appRoles": ["attendee", "organizer", "scanner"],
  "memberships": [
    {
      "eventId": "evt_123",
      "role": "OWNER",
      "acceptedAt": "2026-04-09T09:10:00.000Z"
    },
    {
      "eventId": "evt_456",
      "role": "SCANNER",
      "acceptedAt": "2026-05-15T17:05:00.000Z"
    }
  ]
}
```

That would allow the frontend to remove this temporary logic:

- [role-access.ts](/Users/arnoldekechi/RiderProjects/ticketsystem/frontend/src/lib/auth/role-access.ts)

### Priority 2: Reusable Authorization Guards/Policies

After the capability response exists, the backend should standardize authorization.

Suggested additions:

- `EventMembershipGuard`
- `RequireStaffRole` decorator
- `OwnerOrAdminGuard`
- policy helpers such as `assertEventRole(eventId, userId, allowedRoles)`

This would let controllers express intent more clearly and reduce repetitive service-level checks.

### Priority 3: Stripe End-To-End Hardening

Recommended Stripe follow-up work:

- verify full checkout flow in deployed environments
- verify success/cancel redirect behavior against the frontend
- verify webhook replay and duplicate event handling
- verify delayed webhook behavior
- add operational logging or admin visibility for failed webhook processing
- add a reconciliation path for orders stuck in `PENDING`

### Priority 4: Seed Strategy Cleanup

Create at least two separate commands:

- `db:seed:reset`
- `db:seed:safe`

Potentially:

- `db:seed:test-users`
- `db:seed:demo-event`

This will prevent future production/demo confusion.

## 5. Suggested Implementation Sequence

The cleanest next sequence is:

1. add backend capability response for current user
2. update frontend auth/session model to consume backend roles and memberships
3. add reusable RBAC helpers/guards on the backend
4. replace organizer/scanner email heuristics in the frontend
5. harden Stripe end-to-end behavior
6. split the seed strategy into safe vs destructive variants

## 6. Practical Next Backend Epic

If we were to express the next backend work in BMAD terms, the strongest next epic would be:

### Epic: Authorization and Payment Hardening

Story candidates:

1. expose current-user capabilities and accepted memberships
2. add reusable event-role authorization guards
3. migrate organizer and scanner endpoints to declarative role enforcement
4. update frontend to consume backend-driven role access
5. verify Stripe checkout and webhook lifecycle end to end
6. add safe seeding strategy and non-destructive test fixtures

## 7. Bottom Line

The backend is already strong in domain coverage. The main issue is not missing business workflows. The main issue is that the authorization model and operational hardening have not yet caught up with the breadth of the domain implementation.

In practical terms:

- you do not need to rebuild the backend
- you do need to formalize access control
- you do need to harden Stripe
- you should clean up destructive environment tooling

That is a very good place to be. It means the next phase is refinement and product hardening, not backend rescue.
