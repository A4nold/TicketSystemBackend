# TicketSystem Mobile

This workspace contains the dedicated Expo + React Native mobile app for TicketSystem.

## Current scope

The current mobile app now spans the main product journey from public discovery into authenticated use:

- public discovery home for signed-out browsing
- public event detail with ticket selection and checkout entry
- attendee sign-in and attendee account creation
- attendee sign-in with secure session persistence
- wallet home with next-ticket prioritization
- ticket detail with QR retrieval
- transfer and resale actions
- activity and account supporting surfaces
- organizer event list for accepted owner/admin memberships
- organizer event detail editing for core event fields
- organizer ticket type creation and editing
- organizer staff invite and role management
- scanner event setup, manifest readiness, live validation, and degraded recovery

Organizer resale policy, post-event publishing, and deeper issue operations still stay on the web for now.

## Local development

1. Set the backend URL:

```bash
export EXPO_PUBLIC_API_BASE_URL=http://localhost:3000
```

For real-device testing with Expo Go, `mobile/.env` can point `EXPO_PUBLIC_API_BASE_URL` at your Railway backend API domain so the phone does not fall back to `localhost`.
Use the backend service URL that serves `/api/*`, not the frontend/static Railway domain.

2. Install and run:

```bash
npm install
npm run start
```

For real-device testing, tunnel mode is usually the safest:

```bash
npx expo start --tunnel
```

## Checkout return behavior

- web checkout still returns to the frontend URLs configured by `FRONTEND_APP_URL`
- mobile checkout can now send app return URLs so Stripe success and cancel routes come back into the mobile app
- the app handles those returns through mobile checkout success and cancel screens before routing the user back into wallet/discovery

## Checks

```bash
npm test
npm run typecheck
```
