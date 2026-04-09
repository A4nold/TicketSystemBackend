# TicketSystem

Campus event ticketing platform with attendee purchase and wallet flows, organizer event operations, and scanner entry validation.

## Current State

The application is live and functionally complete across the main product surfaces:

- attendee auth, checkout, wallet, QR, transfer, and resale flows
- organizer event creation, editing, resale policy, staff management, and operational readiness
- scanner event setup, live validation, degraded-mode recovery, and operational ticket issue lookup
- backend auth and authorization hardening, Stripe checkout/webhook handling, and role-aware organizer onboarding

The repo now also has an automated testing foundation in place:

- backend Vitest unit tests for auth, authorization, and order invariants
- frontend Vitest + Testing Library tests for auth flows, route gating, scanner workflows, organizer management, and checkout return handling

## Architecture

- backend: NestJS + Prisma + PostgreSQL
- frontend: Next.js App Router + React Query
- payments: Stripe
- deployment: Railway with separate backend and frontend services

## Local Development

### Backend

```bash
npm install
npm run start:dev
```

Backend runs at:

- `http://localhost:3000/api`

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at:

- `http://localhost:3001`

## Database Seed Modes

Demo/local reset:

```bash
npm run db:seed
```

Production-safe reset preserving users:

```bash
npm run db:seed:production-reset
```

Production membership bootstrap:

```bash
npm run db:seed:production-memberships
```

## Test Commands

Backend:

```bash
npm test
npm run typecheck
```

Frontend:

```bash
cd frontend
npm test
npm run lint
npm run build
```

## Production

Frontend:

- `https://gleaming-light-production.up.railway.app`

Backend:

- `https://ticketsystembackend-production.up.railway.app`

## Notes

- organizer onboarding now supports organizer account creation directly at registration
- scanner and admin access remain event-scoped through accepted staff memberships
- BMAD planning artifacts are intentionally excluded from git going forward
