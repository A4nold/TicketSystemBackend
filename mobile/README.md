# TicketSystem Mobile

This workspace contains the dedicated Expo + React Native mobile app for TicketSystem.

## Current scope

This first mobile slice is attendee-first and wallet-first:

- attendee sign-in with secure session persistence
- wallet home with next-ticket prioritization
- ticket detail with QR retrieval
- transfer and resale actions
- activity and account supporting surfaces

Organizer and scanner mobile surfaces are deferred for later phases.

## Local development

1. Set the backend URL:

```bash
export EXPO_PUBLIC_API_BASE_URL=http://localhost:3000
```

2. Install and run:

```bash
npm install
npm run start
```

## Checks

```bash
npm test
npm run typecheck
```
