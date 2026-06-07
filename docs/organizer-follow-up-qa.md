# Organizer Follow-up QA Backlog

This document tracks the two areas we are intentionally pausing while the core organizer onboarding, event creation, and primary payment flows are already working well.

## Deferred QA Areas

### 1. Refund Flow QA

Goal:
- verify full refund behavior
- verify partial refund behavior
- verify webhook reconciliation
- verify organizer payout summary impact

Suggested checks:
- create a paid Stripe order in staging
- issue a full refund
- confirm order state, refund record, and organizer summary update
- repeat with a partial refund on a different order
- verify refund-related Stripe webhook handling

Open questions to confirm later:
- application fee refund behavior
- reverse transfer behavior on partial refunds
- ticket usability/state after partial refund

### 2. Admin Payments Tooling QA

Goal:
- verify `PLATFORM_ADMIN` access
- verify operational endpoints behave correctly
- confirm non-admin organizers cannot access admin tools

Suggested checks:
- `GET /api/admin/payments/webhook-failures`
- `GET /api/admin/payments/exceptions`
- `GET /api/admin/payments/reconciliation/summary`
- selected sync/replay actions in a safe staging scenario

Open questions to confirm later:
- best admin-only UI surface for these tools
- whether replay/sync actions need extra confirmation UX
- whether additional audit logging is needed before wider internal rollout

## Recommended Re-entry Order

1. Refund flow QA
2. Organizer finance verification after refunds
3. Admin payments tooling QA
4. Any resulting cleanup or hardening
