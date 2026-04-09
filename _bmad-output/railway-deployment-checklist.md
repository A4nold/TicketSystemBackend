# Railway Deployment Checklist

This checklist documents the current production deployment shape for the
ticketing platform on Railway.

The repository contains two deployable apps in one repo:

- backend API at the repository root
- Next.js frontend in [frontend](/Users/arnoldekechi/RiderProjects/ticketsystem/frontend)

The recommended Railway setup is:

- one Railway project
- one Postgres service
- one backend service
- one frontend service

This file uses the current live Railway deployment as the working example.

## 1. Deployment Architecture

Use a single GitHub repository with separate Railway services:

- `TicketSystemBackend`
- `gleaming-light` for the frontend
- `Postgres`

Why this setup works well:

- backend and frontend deploy independently
- each service has its own environment variables
- backend keeps its Docker-based deploy settings
- frontend uses its own `frontend/railway.json`
- rollbacks and redeploys are safer and easier to reason about

## 2. Backend Service Setup

The backend service is deployed from the repository root.

Backend Railway settings:

- Service: `TicketSystemBackend`
- Root Directory: `.`
- Config file: [railway.json](/Users/arnoldekechi/RiderProjects/ticketsystem/railway.json)
- Builder: Dockerfile

Current backend `railway.json` behavior:

```json
{
  "$schema": "https://railway.com/railway.schema.json",
  "build": {
    "builder": "DOCKERFILE"
  },
  "deploy": {
    "healthcheckPath": "/api/health",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

## 3. Frontend Service Setup

The frontend service is deployed from the `frontend` folder, not from the
repository root.

Frontend Railway settings:

- Service: `gleaming-light`
- Root Directory: `frontend`
- Config file: [frontend/railway.json](/Users/arnoldekechi/RiderProjects/ticketsystem/frontend/railway.json)
- Build Command: `npm run build`
- Start Command: `npm run start`

Current frontend `railway.json`:

```json
{
  "$schema": "https://railway.com/railway.schema.json",
  "deploy": {
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

This separation is important because the root Railway config is backend-specific
and should not be reused by the frontend service.

## 4. Postgres Setup

Create or keep a Railway Postgres service in the same project.

Expected backend database variable:

```env
DATABASE_URL=postgresql://...
```

After Postgres is attached:

1. confirm the backend service sees the correct `DATABASE_URL`
2. run migrations against the production database
3. seed only if you intentionally want seeded data in that environment

Recommended commands:

```bash
npx prisma validate
npm run prisma:generate
npm run migrate:deploy
```

Optional seed:

```bash
npm run db:seed
```

## 5. Required Backend Environment Variables

Set these on the backend service before deploy:

```env
DATABASE_URL=postgresql://...
JWT_SECRET=...
JWT_EXPIRES_IN=1d
QR_TOKEN_SECRET=...
QR_TOKEN_EXPIRES_IN=15m
PORT=3000
FRONTEND_APP_URL=https://your-frontend-domain
CORS_ORIGINS=https://your-frontend-domain
```

Notes:

- `JWT_SECRET` should be long and random
- `QR_TOKEN_SECRET` should be different from `JWT_SECRET`
- `FRONTEND_APP_URL` is used for redirect and frontend-aware flows
- `CORS_ORIGINS` must include the frontend production domain
- `PORT` is usually handled by Railway, but documenting it is still useful

## 6. Optional Backend Payment Variables

Set these only if Stripe checkout/webhooks should be active:

```env
STRIPE_SECRET_KEY=sk_live_or_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

If `STRIPE_SECRET_KEY` is missing:

- checkout may still create pending orders
- Stripe session creation is skipped
- `checkoutUrl` may be `null`

## 7. Required Frontend Environment Variables

Set this on the frontend service:

```env
NEXT_PUBLIC_API_BASE_URL=https://your-backend-domain
```

This is required at build time and must be a full URL including `https://`.

Example:

```env
NEXT_PUBLIC_API_BASE_URL=https://ticketsystembackend-production.up.railway.app
```

If you omit `https://`, the frontend build can fail because the app validates
this variable as a URL.

### Frontend Env File Split

The frontend uses different env files for local development and for deployment
reference:

- local development: [frontend/.env.local](/Users/arnoldekechi/RiderProjects/ticketsystem/frontend/.env.local)
- production/reference sample: [frontend/.env.example](/Users/arnoldekechi/RiderProjects/ticketsystem/frontend/.env.example)

Current values:

```env
# frontend/.env.local
NEXT_PUBLIC_API_BASE_URL=http://localhost:3000
```

```env
# frontend/.env.example
NEXT_PUBLIC_API_BASE_URL=https://ticketsystembackend-production.up.railway.app
```

Notes:

- `frontend/.env.local` is for running the frontend against the local backend
- `frontend/.env.local` is ignored by git and should remain local-only
- `frontend/.env.example` is the safe shared reference for production-style configuration
- Railway still needs the variable to be set in the Railway service settings; `.env.example` is documentation, not the live secret source

## 8. Step-By-Step Deployment Flow

### Backend deploy

1. Connect the repo to Railway if it is not already connected.
2. Keep the backend service pointed at the repository root.
3. Ensure Railway is using the root [railway.json](/Users/arnoldekechi/RiderProjects/ticketsystem/railway.json).
4. Set backend environment variables.
5. Confirm Postgres is attached.
6. Deploy the backend service.
7. Verify:
   - `/api/health`
   - `/docs`
   - auth endpoints

### Frontend deploy

1. Create a second Railway service from the same repo.
2. Set its Root Directory to `frontend`.
3. Ensure it uses [frontend/railway.json](/Users/arnoldekechi/RiderProjects/ticketsystem/frontend/railway.json).
4. Set:
   - `NEXT_PUBLIC_API_BASE_URL=https://your-backend-domain`
5. Set Build Command:

```bash
npm run build
```

6. Set Start Command:

```bash
npm run start
```

7. Deploy the frontend service.
8. Generate or confirm the Railway public domain for the frontend service.
9. Copy that frontend URL back into the backend service:
   - `FRONTEND_APP_URL`
   - `CORS_ORIGINS`
10. Redeploy the backend if those values changed after the frontend URL was created.

## 9. Railway CLI Reference

These commands match the deployment flow used for the current live setup.

Link the frontend folder to the frontend Railway service:

```bash
cd frontend
railway service link gleaming-light
```

Set the frontend API base URL:

```bash
railway variable set 'NEXT_PUBLIC_API_BASE_URL=https://ticketsystembackend-production.up.railway.app'
```

Deploy the frontend:

```bash
railway up -d -m "Deploy frontend service"
```

Generate a Railway public domain for the frontend:

```bash
railway domain -s gleaming-light --json
```

Update backend variables from the frontend domain:

```bash
railway variable set -s TicketSystemBackend \
  'FRONTEND_APP_URL=https://your-frontend-domain' \
  'CORS_ORIGINS=https://your-frontend-domain'
```

## 10. Runtime Verification Checklist

After backend deploy, verify:

- `/api/health` responds
- `/docs` loads
- `/api/auth/login` works
- `/api/auth/register` works
- `/api/auth/me` works with a valid token

After frontend deploy, verify:

- home page loads
- public event page loads
- auth page loads
- attendee tickets page loads after sign-in
- browser requests point to the Railway backend URL, not localhost

## 11. Webhook Setup

If Stripe is enabled, create a webhook endpoint pointing to:

```text
https://your-backend-domain/api/payments/webhooks/stripe
```

Subscribe at minimum to:

- `checkout.session.completed`
- `checkout.session.expired`

Then add:

```env
STRIPE_WEBHOOK_SECRET=whsec_...
```

## 12. Production Notes

Important lessons from the current deployment:

- backend and frontend should be separate Railway services
- frontend must deploy from `frontend/`
- frontend `NEXT_PUBLIC_API_BASE_URL` must include `https://`
- backend `CORS_ORIGINS` should point to the deployed frontend URL, not localhost
- the frontend may deploy successfully before a public domain exists, so generate a Railway domain if needed

## 13. Current Production Links

These are the live production URLs from the current Railway setup.

Frontend:

```text
https://gleaming-light-production.up.railway.app
```

Backend:

```text
https://ticketsystembackend-production.up.railway.app
```

Useful backend URLs:

```text
https://ticketsystembackend-production.up.railway.app/api/health
https://ticketsystembackend-production.up.railway.app/docs
```

Recommended backend production values based on the live frontend deployment:

```env
FRONTEND_APP_URL=https://gleaming-light-production.up.railway.app
CORS_ORIGINS=https://gleaming-light-production.up.railway.app
```
