# Offer-Range Observability Dashboard (Epic 7)

## Primary Log Signals
- Offer created:
  - `offers.request.created`
- Offer accepted:
  - `offers.request.accepted`
- Offer rejected:
  - `offers.request.rejected`
- Offer applied to checkout quote:
  - `checkout.offer.applied`

## Suggested Dashboard Tiles
1. Offer volume (hour/day)
- Count `offers.request.created`

2. Acceptance rate
- `count(offers.request.accepted) / count(offers.request.created)`

3. Rejection rate
- `count(offers.request.rejected) / count(offers.request.created)`

4. Offer to checkout conversion
- `count(checkout.offer.applied) / count(offers.request.accepted)`

5. Currency split
- Group by `currency` from log payload

6. Event-level hotspots
- Group by `eventId` to find outliers in rejection and conversion

## Alert Suggestions
- High rejection spike:
  - rejection rate > 70% over 30 min
- Conversion drop:
  - offer->checkout conversion drops > 40% from 7-day baseline
- Sudden zero volume during expected hours

## Support Query Snippets
- Recent offer lifecycle by attendee:
  - filter by `attendeeUserId=<id>` and terms `offers.request.` `checkout.offer.applied`
- Event-specific issues:
  - filter by `eventId=<id>` and compare created vs accepted vs rejected
