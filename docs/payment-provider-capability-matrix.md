# Payment Provider Capability Matrix

## Current Maya Position

- `Stripe` is Maya's primary marketplace payout provider
- `Paystack` currently supports customer checkout flows
- `Paystack` organizer payout onboarding is rollout-gated and should not be treated as feature-parity with Stripe unless explicitly enabled

## Stripe

- Rollout stage: `ACTIVE`
- Organizer onboarding: supported
- Organizer payouts: supported
- Automated platform fee collection: supported
- Refund operations: supported
- Dispute operations: supported
- Operating model: `Stripe Connect Express` with destination charges and application fees

## Paystack

- Rollout stage:
  - `PLANNED` by default
  - `LIMITED` when `ENABLE_PAYSTACK_ORGANIZER_ONBOARDING=true`
- Customer checkout: supported
- Organizer onboarding: gated
- Organizer payouts: gated
- Automated platform fee collection: limited / not yet formalized to Stripe parity
- Refund operations: supported at checkout layer
- Dispute operations: not yet modeled to Stripe parity in Maya ops
- Operating model:
  - today: customer checkout support
  - later: regional NG / NGN organizer payout path when rollout is enabled

## Product Rule

- Recommend `Stripe` by default
- Recommend `Paystack` only for organizers with:
  - `country=NG`
  - `defaultPayoutCurrency=NGN`
  - and only when Paystack organizer onboarding is enabled

## UX Rule

- Never present Paystack as fully equivalent to Stripe unless organizer payout onboarding is active
- Show Paystack as:
  - `Coming soon` when payout onboarding is off
  - `Unavailable` when organizer profile does not match the supported NG / NGN path
  - `Available` only when the rollout flag is enabled and the organizer profile matches
