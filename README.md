# TicketSystem

TicketSystem is a full-stack event ticketing platform for events. It supports public event discovery, attendee checkout and wallet flows, protected ticket transfer and resale, organizer event operations, and scanner-based entry validation.

## Current Product State

The app is currently organized around four main surfaces:

- Public marketplace
  - homepage with featured and upcoming events
  - public event detail pages
  - event-scoped resale marketplace
- Attendee wallet
  - wallet-first post-login landing
  - owned tickets grouped by event
  - ticket detail views and QR access
  - transfer inbox and acceptance flow
  - resale actions on owned tickets
- Organizer workspace
  - event creation and editing
  - ticket type configuration
  - resale policy controls
  - staff invitation and management
- Scanner workspace
  - event selection
  - live ticket validation
  - degraded-mode recovery
  - recent scan attempt review

## Key Features

- JWT auth with role-aware surfaces
- Stripe-backed checkout and payment confirmation
- wallet-based ticket ownership
- QR token generation for issued tickets
- attendee-to-attendee ticket transfer
- controlled event resale marketplace
- organizer event and staff operations
- scanner validation with degraded-mode support
- backend and frontend regression test coverage for the critical product flows

## Stack

- Backend: NestJS, Prisma, PostgreSQL
- Frontend: Next.js App Router, React 19, React Query
- Payments: Stripe
- Email notifications: Resend integration with safe fallback logging when not configured
- Deployment: Railway with separate backend and frontend services

## Repo Layout

```text
.
├── src/                # NestJS backend
│   ├── auth/
│   ├── events/
│   ├── orders/
│   ├── payments/
│   ├── resale/
│   ├── scanner/
│   ├── tickets/
│   └── transfers/
├── prisma/             # Prisma schema and seed scripts
├── frontend/           # Next.js frontend
└── _bmad-output/       # planning and story artifacts
```

## Architecture Notes

The codebase has recently been refactored toward more concentrated services and UI surfaces.

Current backend direction:

- query services separated from mutation workflows where it meaningfully reduces service sprawl
- response mappers extracted from large services
- ticket ownership history centralized
- transfer, resale, checkout, and payment workflows split into focused services
- selective repositories introduced only where repeated Prisma access patterns were clearly emerging

Current frontend direction:

- wallet surface composed from dedicated sections instead of one large gateway component
- scanner workspace split into focused UI panels
- public homepage, marketplace, and event presentation extracted into reusable view sections

## Local Development

### 1. Install dependencies

Backend:

```bash
npm install
```

Frontend:

```bash
cd frontend
npm install
```

### 2. Configure environment variables

Backend uses [`.env.example`](/Users/arnoldekechi/RiderProjects/ticketsystem/.env.example) as the baseline.

Main backend variables:

```env
DATABASE_URL=
JWT_SECRET=
JWT_EXPIRES_IN=1d
QR_TOKEN_SECRET=
QR_TOKEN_EXPIRES_IN=15m
FRONTEND_APP_URL=http://localhost:3001
CORS_ORIGINS=http://localhost:3001
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
PORT=3000
```

Optional notification variables used by transfer emails:

```env
RESEND_API_KEY=
NOTIFICATIONS_FROM_EMAIL=
PUBLIC_APP_URL=http://localhost:3001
```

Frontend uses [`.env.example`](/Users/arnoldekechi/RiderProjects/ticketsystem/frontend/.env.example):

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:3000
```

### 3. Run the backend

```bash
npm run start:dev
```

Backend runs at:

- `http://localhost:3000/api`
- Swagger docs: `http://localhost:3000/docs`

### 4. Run the frontend

```bash
cd frontend
npm run dev
```

Frontend runs at:

- `http://localhost:3001`

## Database and Seeds

Generate Prisma client:

```bash
npm run prisma:generate
```

Production-style migrations:

```bash
npm run migrate:deploy
```

Seed commands:

```bash
npm run db:seed
npm run db:seed:production-reset
npm run db:seed:production-memberships
```

Typical local development flow:

```bash
npm run db:seed
npm run start:dev
```

## Testing

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

Coverage currently exists around:

- auth and route/surface protection
- order and payment invariants
- wallet and transfer inbox flows
- public resale listing behavior
- scanner workflow behavior
- event and ticket response shaping

## Production

Current Railway services:

- Frontend: `gleaming-light`
- Backend: `TicketSystemBackend`

Current production URLs:

- frontend: `https://gleaming-light-production.up.railway.app`
- backend: `https://ticketsystembackend-production.up.railway.app`

## Deployment

Railway CLI deploy flow:

Backend:

```bash
railway up --service TicketSystemBackend
```

Frontend:

```bash
cd frontend
railway up --service gleaming-light
```

If Railway CLI auth expires:

```bash
railway login
```

## Current Functional Notes

- wallet is the primary attendee home after sign-in
- transfer notifications currently use email plus in-app inbox
- SMS notifications are not implemented yet
- organizer and scanner surfaces are intentionally preserved while the public and wallet surfaces evolve
- scanner camera support exists in the web client, but browser/device compatibility may vary

## Near-Term Next Work

- README/documentation cleanup across the rest of the repo
- media-friendly event management and public event imagery
- deeper production validation of transfer email delivery
- possible dedicated mobile scanner app exploration

## BMAD Notes

BMAD planning artifacts live in `_bmad-output/` and were used to drive:

- marketplace and wallet correction planning
- story-based frontend/product changes
- staged refactor correction work

They are useful project context, but the codebase should be understood from the current implementation first.
