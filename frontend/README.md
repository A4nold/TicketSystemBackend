# Ticketsystem Frontend

This app is the isolated Next.js frontend for the Private Event Smart Ticketing
Platform. It is intentionally separate from the NestJS backend at the repo root.

## Run locally

1. Use the local-only [`.env.local`](/Users/arnoldekechi/RiderProjects/ticketsystem/frontend/.env.local) file for development.
2. Update `NEXT_PUBLIC_API_BASE_URL` there if you want to point at a different backend.
3. Treat [`.env.example`](/Users/arnoldekechi/RiderProjects/ticketsystem/frontend/.env.example) as the production/reference sample.
4. Start the frontend:

```bash
npm install
npm run dev
```

The default local URL is [http://localhost:3001](http://localhost:3001).

## Foundation included in Story 1.1

- Next.js App Router with TypeScript and Tailwind
- Route groups for public, attendee, organizer, and scanner surfaces
- TanStack Query provider wiring
- Shared API configuration through `NEXT_PUBLIC_API_BASE_URL`
- Token-ready global styling and reusable shell primitives

## Not included yet

- Attendee authentication
- Ticket purchase and issuance flows
- Owned ticket wallet and QR rendering
- Organizer CRUD workflows
- Scanner validation logic
