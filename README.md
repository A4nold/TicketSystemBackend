# TicketSystem

TicketSystem is a full-stack event ticketing platform focused on an event wallet experience. It supports public event discovery, attendee checkout and wallet flows, protected ticket transfer and resale, organizer event operations, post-event re-engagement, and scanner-based entry validation.

## Current Product State

The app is currently organized around four main product surfaces:

- Public marketplace
  - homepage with featured and upcoming events
  - public event detail pages
  - event-scoped resale marketplace
- Attendee wallet
  - wallet-first post-login landing
  - owned tickets grouped by event
  - ticket detail views and QR access
  - merged activity feed for notifications and pending actions
  - transfer inbox, reminders, expiry handling, and acceptance flow
  - resale actions and seller payout transparency on owned tickets
  - post-event content visibility after event completion
- Organizer workspace
  - event creation and editing
  - ticket type configuration
  - resale policy controls including floor, cap, and royalty
  - post-event message and CTA publishing
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
- attendee-to-attendee ticket transfer with reminder, expiry, cancellation, and audit-safe ownership recovery
- in-app wallet notifications for transfer, resale, and post-event updates
- controlled event resale marketplace with organizer rules and seller settlement clarity
- organizer post-event content publishing with background notification sweep
- organizer event and staff operations
- scanner validation with degraded-mode support
- backend and frontend regression coverage for critical wallet, transfer, resale, and post-event flows

## Stack

- Backend: NestJS, Prisma, PostgreSQL
- Frontend: Next.js App Router, React 19, React Query
- Payments: Stripe
- Notifications: in-app notifications plus Resend-backed email sends where configured
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
- transfer, resale, checkout, payment, and notification workflows split into focused services
- post-event notification delivery protected by both request-time best-effort logic and a scheduled sweep
- selective repositories introduced only where repeated Prisma access patterns were clearly emerging

Current frontend direction:

- wallet surface composed from dedicated sections instead of one large gateway component
- wallet activity now merges notifications with actionable ticket state
- organizer event management has been expanded rather than replaced
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
PUBLIC_APP_URL=http://localhost:3001
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
RESEND_API_KEY=
NOTIFICATIONS_FROM_EMAIL=
POST_EVENT_NOTIFICATION_SWEEP_INTERVAL_MS=300000
PORT=3000
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
npm run db:seed:campus-neon-takeover2
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
- wallet activity, notifications, and transfer inbox flows
- transfer lifecycle, expiry, reminder, and ownership audit behavior
- public and owned-ticket resale behavior
- organizer resale policy and post-event content behavior
- scanner workflow behavior
- event and ticket response shaping

## Production

Current Railway services:

- Frontend: `gleaming-light`
- Backend: `TicketSystemBackend`
- Database: `Postgres`

Current production URLs:

- frontend: `https://gleaming-light-production.up.railway.app`
- backend: `https://ticketsystembackend-production.up.railway.app`

## Deployment

Railway CLI deploy flow:

Recommended sequence:

```bash
# 1. Check production migration state
DATABASE_URL="<production public postgres url>" npx prisma migrate status --schema prisma/schema.prisma

# 2. Apply migrations first
DATABASE_URL="<production public postgres url>" npm run migrate:deploy
```

Backend:

```bash
railway up --service TicketSystemBackend --environment production
```

Frontend:

```bash
cd frontend
railway up --service gleaming-light --environment production
```

If Railway CLI auth expires:

```bash
railway login
```

## Current Functional Notes

- wallet is the primary attendee home after sign-in
- transfer, resale, and post-event notifications are available in-app
- post-event notifications are protected by a scheduled sweep so they do not depend solely on attendee reads
- SMS notifications are not implemented
- organizer and scanner surfaces are intentionally preserved while the public and wallet surfaces evolve
- scanner camera support exists in the web client, but browser/device compatibility may vary
- staging environment is not set up yet
- production is currently live on Railway
- deeper production validation of transfer email delivery
- possible dedicated mobile scanner app exploration

## BMAD Notes

BMAD planning artifacts live in `_bmad-output/` and were used to drive:

- marketplace and wallet correction planning
- story-based frontend/product changes
- staged refactor correction work

They are useful project context, but the codebase should be understood from the current implementation first.
