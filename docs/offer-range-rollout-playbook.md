# Offer-Range Rollout Playbook (Epic 7)

## Feature Flag
- Flag name: `ENABLE_OFFER_RANGE_PRICING`
- Values treated as enabled: `true`, `1`, `yes`, `on`
- Default: disabled when env var is absent

## Environments
- Local: set in `.env`
- Railway staging/prod: set via `railway variable set ENABLE_OFFER_RANGE_PRICING=true`

## Staged Rollout
1. Deploy with `ENABLE_OFFER_RANGE_PRICING=false`.
2. Run smoke checks:
- `npm run test -- src/offers/offers.service.spec.ts src/orders/checkout.service.spec.ts src/events/events.service.spec.ts`
- `npm run test:e2e:offer-range:mobile-critical`
3. Enable in staging only.
4. Run `npm run test:e2e:offer-range:api` against staging API and seeded EUR/NGN events.
5. Enable in production during low-traffic window.
6. Monitor logs and conversion trend for 60 minutes.

## Fast Rollback
1. Set `ENABLE_OFFER_RANGE_PRICING=false`.
2. Restart service (or redeploy if needed).
3. Confirm new offer creation now returns feature-disabled error.
4. Existing schema/data stays intact. No migration rollback needed.

## Support Triage
- Rejected offer: attendee should submit a new amount in range.
- Expired offer: attendee must submit a new request.
- Replay token error (`already been used`): user likely retried checkout with stale link; ask them to use latest accepted-offer notification.
- Invalid token / not accepted: confirm organizer action in offer inbox.
