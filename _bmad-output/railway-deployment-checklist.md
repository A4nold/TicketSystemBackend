# Railway Deployment Env Checklist

This checklist is for deploying the current backend API to Railway.

The repository now includes a [railway.json](/Users/arnoldekechi/RiderProjects/ticketsystem/railway.json) file so Railway does not need to infer the backend build and start commands.

## 1. Create the Railway Project

- Create a new Railway project for the backend API.
- Connect the repository.
- Set the root directory to the project root.
- Railway config in code:

```json
railway.json
```

- Start command:

```bash
npm run start:prod
```

- Build command:

```bash
npm run build
```

## 2. Provision Postgres

- Add a Railway PostgreSQL service.
- Copy the Railway Postgres connection string into `DATABASE_URL`.
- Confirm the database name is the one you want for the deployed environment.

Expected env var:

```env
DATABASE_URL=postgresql://...
```

## 3. Required Backend Env Vars

These should be set before first deploy:

```env
DATABASE_URL=postgresql://...
JWT_SECRET=...
JWT_EXPIRES_IN=1d
QR_TOKEN_SECRET=...
QR_TOKEN_EXPIRES_IN=15m
PORT=3000
```

Notes:

- `JWT_SECRET` should be a long random secret.
- `QR_TOKEN_SECRET` should be different from `JWT_SECRET`.
- `PORT` is usually supplied by Railway automatically, but keeping it documented is helpful.

## 4. Payment Env Vars

These are required if Stripe checkout and webhook processing should be active:

```env
STRIPE_SECRET_KEY=sk_live_or_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
FRONTEND_APP_URL=https://your-frontend-domain
```

What each one does:

- `STRIPE_SECRET_KEY`: creates live Stripe Checkout Sessions.
- `STRIPE_WEBHOOK_SECRET`: verifies webhook signatures on `/api/payments/webhooks/stripe`.
- `FRONTEND_APP_URL`: used to build Stripe success and cancel redirect URLs.

If `STRIPE_SECRET_KEY` is not set:

- checkout still creates pending orders
- `checkoutUrl` will be `null`
- Stripe session creation is skipped

## 5. Current API Endpoints That Depend On Env

Auth and QR:

- `/api/auth/login`
- `/api/auth/register`
- `/api/me/tickets/:serialNumber/qr`

Payments:

- `/api/orders/checkout`
- `/api/payments/webhooks/stripe`

Scanner:

- `/api/scanner/events/:eventId/validate`

## 6. Database Setup Steps

Run these once the Railway database is connected:

```bash
npx prisma validate
```

Generate Prisma client if needed:

```bash
npm run prisma:generate
```

Apply migrations to the Railway database:

```bash
npm run migrate:deploy
```

Optional seed step for a test environment:

```bash
npm run db:seed
```

Do not seed production unless you intentionally want demo data there.

## 7. Railway Runtime Checks

After deploy, verify:

- the API starts successfully
- `/api/health` responds
- `/docs` loads
- `/api/auth/login` works with a seeded or created user
- `/api/me/tickets/:serialNumber/qr` returns a signed token
- `/api/orders/checkout` returns a `checkoutUrl` when Stripe is configured

## 8. Webhook Setup

In Stripe:

- create a webhook endpoint pointing to:

```text
https://your-railway-domain/api/payments/webhooks/stripe
```

- subscribe at minimum to:
  - `checkout.session.completed`
  - `checkout.session.expired`

- copy the resulting signing secret into:

```env
STRIPE_WEBHOOK_SECRET=whsec_...
```

## 9. Domain / Endpoint Expectations

Railway will give you a public deployment URL for the service.

Typical pattern:

```text
https://your-service-name.up.railway.app
```

Your API endpoints will then look like:

```text
https://your-service-name.up.railway.app/api/health
https://your-service-name.up.railway.app/api/orders/checkout
https://your-service-name.up.railway.app/api/payments/webhooks/stripe
```

## 10. Recommended Secrets Strategy

- Use different secrets for local, preview, and production.
- Rotate `JWT_SECRET` and `QR_TOKEN_SECRET` if they are ever exposed.
- Never commit real Stripe keys or secrets into the repo.

## 11. Current Gaps Before Full Production Readiness

These are not blockers for backend deployment, but they still matter:

- frontend app is not built yet
- Stripe webhook path is implemented, but not yet tested with a real Stripe account
- no `.gitignore` check was done in this step
- no CI deployment pipeline has been added yet

## 12. Minimum Railway Env Set

For a first backend deploy without live Stripe:

```env
DATABASE_URL=postgresql://...
JWT_SECRET=...
JWT_EXPIRES_IN=1d
QR_TOKEN_SECRET=...
QR_TOKEN_EXPIRES_IN=15m
PORT=3000
```

For a backend deploy with Stripe enabled:

```env
DATABASE_URL=postgresql://...
JWT_SECRET=...
JWT_EXPIRES_IN=1d
QR_TOKEN_SECRET=...
QR_TOKEN_EXPIRES_IN=15m
PORT=3000
FRONTEND_APP_URL=https://your-frontend-domain
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...
```
