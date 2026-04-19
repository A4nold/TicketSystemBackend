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

This app now defaults to an Expo development build workflow instead of Expo Go. That is the recommended path for camera, push notifications, deep linking, and checkout return testing.

1. Set the backend URL:

```bash
export EXPO_PUBLIC_API_BASE_URL=http://localhost:3000
```

For real-device testing, `mobile/.env` can point `EXPO_PUBLIC_API_BASE_URL` at your Railway backend API domain so the phone does not fall back to `localhost`.
Use the backend service URL that serves `/api/*`, not the frontend/static Railway domain.

If you want to test push registration beyond the simplest Expo Go path, also set:

```bash
export EXPO_PUBLIC_EXPO_PROJECT_ID=<your-expo-project-id>
```

The account surface can then request notification permission and register the current device for purchase, transfer, and event reminder pushes.

2. Install and run:

```bash
npm install
npm run start
```

Build the native development client first:

```bash
npm run ios
```

On Android:

```bash
npm run android
```

After the native client is installed, start the Metro server for the dev build:

```bash
npm run start
```

If your phone cannot reach your machine cleanly, tunnel mode is usually the safest:

```bash
npm run start:tunnel
```

If you ever want the old Expo Go workflow for quick UI checks only:

```bash
npm run start:go
```

## Development builds

- `expo-dev-client` is installed and this workspace now assumes a development client for day-to-day native testing
- `mobile/eas.json` includes a `development` profile if you later want to create an internal dev build with EAS
- remote push notifications from `expo-notifications` are not fully supported in Expo Go, so use the dev client for story 1.3 and 1.4 testing

## Checkout return behavior

- web checkout still returns to the frontend URLs configured by `FRONTEND_APP_URL`
- mobile checkout can now send app return URLs so Stripe success and cancel routes come back into the mobile app
- the app handles those returns through mobile checkout success and cancel screens before routing the user back into wallet/discovery

## Checks

```bash
npm test
npm run typecheck
```
