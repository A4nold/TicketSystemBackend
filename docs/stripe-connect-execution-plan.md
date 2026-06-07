# Stripe Connect Execution Plan for Maya

## 1. Objective

This document converts the marketplace architecture into an execution plan for the current backend.

Primary goals:

- migrate safely from plain Stripe checkout to Stripe Connect
- preserve current order and ticket issuance behavior during rollout
- avoid big-bang schema or payment cutovers
- create a clear implementation sequence for backend, migrations, and operational readiness

## 2. Current Cutover Points

The current implementation shows three main migration seams:

- `src/orders/checkout.service.ts` creates `orders` first, then starts provider checkout
- `src/payments/payments.service.ts` is the main Stripe integration and webhook processor
- `src/orders/order-payment.service.ts` still supports manual order confirmation semantics that should be reduced once Stripe webhook finalization becomes canonical

Current Stripe flow characteristics:

- checkout is `Stripe Checkout Session` based
- webhook processing is centered on `checkout.session.completed` and `checkout.session.expired`
- order payment truth still leans on `orders.payment_reference`
- ticket issuance is payment-triggered, but still tightly coupled to order status updates

## 3. Delivery Principles

Use these principles for execution:

1. keep migrations additive first
2. dual-write before switching reads
3. keep ticket issuance behind trusted payment finalization
4. feature-flag Connect rollout
5. separate schema alignment from payment behavior changes

## 4. Rollout Phases

### Phase 0: Alignment and Safety Rails

Purpose:

- eliminate schema drift
- establish feature flags
- prepare observability and rollout controls

Outputs:

- Prisma schema aligned with existing payment-domain migration
- new feature flags for Connect onboarding and Connect checkout
- payment-domain logging and dashboards defined

### Phase 1: Payment Domain Completion

Purpose:

- formalize payment persistence before changing Stripe behavior

Outputs:

- Prisma models for `organizer_payment_profiles`, `payment_accounts`, `payment_transactions`, `platform_fees`, `refunds`
- new `disputes` table
- repository layer for payment-domain access

### Phase 2: Organizer Stripe Connect Onboarding

Purpose:

- let organizers create or connect Stripe Express accounts
- determine readiness for paid events

Outputs:

- organizer payment account APIs
- onboarding link flow
- account sync service
- `account.updated` webhook processing

### Phase 3: Event Publication Guardrails

Purpose:

- prevent paid events from going live without a usable Stripe account

Outputs:

- paid-event publish readiness checks
- organizer-facing readiness statuses

### Phase 4: Connect Checkout Introduction

Purpose:

- create `PaymentIntent` destination charges with `application_fee_amount`

Outputs:

- new Connect checkout service
- `payment_transactions` and `platform_fees` written during checkout
- mobile and web response contracts updated for client-secret flow

### Phase 5: Webhook Canonicalization

Purpose:

- make `payment_intent.succeeded` and related Stripe events the source of truth

Outputs:

- expanded webhook handlers
- idempotent finalization logic
- order and ticket issuance cut over to transaction-driven success

### Phase 6: Refunds, Partial Refunds, and Disputes

Purpose:

- complete the operational payment lifecycle

Outputs:

- refund APIs
- refund persistence and reverse-transfer strategy
- dispute ingestion and organizer visibility

### Phase 7: Reconciliation and Legacy Removal

Purpose:

- remove obsolete session-oriented and manual-confirmation assumptions

Outputs:

- scheduled reconciliation jobs
- old payment confirmation endpoints deprecated or restricted
- legacy Stripe Checkout flow removed for Connect-enabled events

## 5. Migration Sequence

### Migration 1: Prisma Schema Alignment

Goal:

- bring `prisma/schema.prisma` in line with the existing migration already present in the repo

Tasks:

- add missing enums:
  - `PaymentAccountStatus`
  - `PaymentTransactionType`
  - `PaymentTransactionStatus`
  - `SettlementState`
  - `RefundStatus`
- add missing models:
  - `OrganizerPaymentProfile`
  - `PaymentAccount`
  - `PaymentTransaction`
  - `PlatformFee`
  - `OrganizerEarning`
  - `Refund`
- wire relations from `User`, `Event`, `Order`, and `ResaleListing`

Acceptance criteria:

- Prisma schema represents the payment-domain tables already created by [20260522062601_add_payment_domain_foundation_day1](/Users/arnoldekechi/RiderProjects/ticketsystem/prisma/migrations/20260522062601_add_payment_domain_foundation_day1/migration.sql:1)
- app boots with generated Prisma client

### Migration 2: Connect-Specific Fields

Goal:

- add the fields needed for Stripe Connect operations

Tasks:

- extend `payment_accounts` with:
  - `account_type`
  - `verification_status`
  - `onboarding_status`
  - `details_submitted`
  - `country`
  - `default_currency`
  - `currently_due_requirements`
  - `eventually_due_requirements`
  - `past_due_requirements`
  - `last_synced_at`
- extend `payment_transactions` with:
  - `organizer_id`
  - `provider_charge_id`
  - `provider_transfer_id`
  - `provider_application_fee_id`
  - `connected_account_id`
  - `idempotency_key`
  - `captured_at`
  - `canceled_at`
- extend `platform_fees` with:
  - `fixed_fee_application`
  - `pricing_rule_id`
  - `pricing_rule_snapshot`
- extend `refunds` with:
  - `reverse_transfer`
  - `refund_application_fee`
  - `provider_reversal_id`

Acceptance criteria:

- all fields required by the architecture doc exist in schema and database

### Migration 3: Add `disputes`

Goal:

- persist Stripe dispute lifecycle

Tasks:

- create `disputes` table
- add unique key on `provider_dispute_id`
- add relation to `payment_transactions`

Acceptance criteria:

- webhook handlers can upsert dispute state without schema gaps

### Migration 4: Order and Event Anchors

Goal:

- connect existing commerce entities to the payment domain

Tasks:

- add `orders.organizer_id`
- add `orders.payment_transaction_id` if using direct anchor
- add `orders.payment_confirmed_at`
- add `orders.checkout_expires_at`
- add `events.payment_account_id`
- add `events.payment_readiness_status`

Backfill:

- set `orders.organizer_id = events.organizer_id`

Acceptance criteria:

- checkout logic can resolve organizer payment readiness without extra joins everywhere

### Migration 5: Backfill Historical Rows

Goal:

- preserve existing payment history

Tasks:

- backfill `organizer_payment_profiles` for existing organizer users
- backfill `orders.organizer_id`
- create best-effort `payment_transactions` for existing paid Stripe orders where possible
- copy historical fee information into `platform_fees`
- mark migrated records in metadata

Acceptance criteria:

- dashboards and payment reports can mix historical and new records

## 6. Feature Flags

Add flags before behavioral rollout:

- `ENABLE_STRIPE_CONNECT_ONBOARDING`
- `ENABLE_STRIPE_CONNECT_CHECKOUT`
- `ENABLE_STRIPE_CONNECT_EVENT_PUBLISH_GUARD`
- `ENABLE_STRIPE_CONNECT_REFUNDS`
- `ENABLE_STRIPE_CONNECT_DISPUTES`

Suggested rollout rules:

- onboarding flag can turn on first
- checkout flag should be organizer- or event-scoped, not only global

## 7. Backend Task Breakdown

### Epic A: Schema and Data Layer

Tasks:

1. Align Prisma schema with existing payment-domain migration
2. Add Connect-specific columns and `disputes`
3. Generate Prisma client and fix type usage
4. Create repositories:
   - `PaymentAccountRepository`
   - `PaymentTransactionRepository`
   - `PlatformFeeRepository`
   - `RefundRepository`
   - `WebhookEventRepository`
5. Add read-model query helpers for organizer payment status

Definition of done:

- payment-domain entities are first-class in code and database

### Epic B: Organizer Onboarding

Tasks:

1. Create `OrganizerStripeAccountService`
2. Create account creation flow for Express
3. Create onboarding-link generation
4. Create refresh-link flow
5. Create account retrieval and sync logic
6. Add `account.updated` webhook handler
7. Add organizer status endpoints

Definition of done:

- organizer can complete Stripe onboarding end-to-end and readiness is persisted

### Epic C: Event Publish Guard

Tasks:

1. Add payment readiness query to event management responses
2. Block publish if event has paid ticket types and organizer is not ready
3. Add explicit domain error code for payment readiness failure

Definition of done:

- no paid event can go live without a usable connected account

### Epic D: Connect Checkout

Tasks:

1. Create `StripeConnectCheckoutService`
2. Create pricing-rule resolution service
3. Refactor `CheckoutService` to:
   - validate payment readiness
   - create `order`
   - create `payment_transaction`
   - create `platform_fee`
   - call `StripeConnectCheckoutService`
4. Return PaymentIntent client-secret contract
5. Keep free-order path working

Definition of done:

- Connect-enabled events use destination-charge PaymentIntents

### Epic E: Payment Finalization

Tasks:

1. Create webhook orchestration service
2. Add handlers for:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `charge.refunded`
   - `charge.dispute.created`
   - `account.updated`
3. Move payment success logic from checkout-session semantics to transaction semantics
4. Ensure ticket issuance happens only once
5. Add reconciliation job for stale pending transactions

Definition of done:

- payment transaction success is canonical and idempotent

### Epic F: Refunds and Disputes

Tasks:

1. Create refund orchestration service
2. Add refund APIs
3. Update order and ticket refund transitions
4. Add dispute persistence and organizer visibility
5. Add support tooling or admin views later

Definition of done:

- Maya can process and track full and partial refunds plus disputes

### Epic G: Legacy Flow Retirement

Tasks:

1. Restrict `OrderPaymentService.confirmPayment` for Stripe Connect orders
2. Remove dependency on `checkout.session.completed` for new flows
3. Remove or deprecate session-based Stripe response fields where no longer needed
4. Keep Paystack paths untouched for this program

Definition of done:

- Connect orders no longer rely on legacy confirmation paths

## 8. File-by-File Execution Starting Points

### `prisma/schema.prisma`

Work:

- align with existing payment-domain migration
- add Connect-specific extensions and `disputes`

### `src/orders/checkout.service.ts`

Current role:

- order creation plus provider bootstrap

Required changes:

- call payment readiness validation before order creation
- create `payment_transaction` and `platform_fee`
- switch Stripe flow from checkout session creation to PaymentIntent creation
- stop treating `order.paymentReference` as the primary payment ledger

### `src/payments/payments.service.ts`

Current role:

- mixed Stripe session creation, Paystack flow, webhook handling, and payment reconciliation

Required changes:

- split into smaller services
- add Connect onboarding methods
- add PaymentIntent creation with destination charge fields
- add account sync logic
- change webhook handlers from session-first to payment-intent-first

### `src/orders/order-payment.service.ts`

Current role:

- manual order payment confirmation path

Required changes:

- keep only as a compatibility or non-Stripe/manual path
- block or bypass for Stripe Connect orders

### `src/payments/payments.controller.ts`

Current role:

- provider webhook entrypoint

Required changes:

- keep raw-body and signature validation
- route more event types into payment-intent and account synchronization handlers

## 9. Recommended Cutover Strategy

### Stage 1: Dark Launch

- ship schema, repositories, and onboarding APIs
- do not change checkout yet

### Stage 2: Internal Organizer Trial

- enable onboarding for internal or trusted organizers
- validate account readiness and `account.updated` behavior

### Stage 3: Event-Scoped Connect Checkout

- enable Connect checkout for selected events only
- continue legacy Stripe Checkout for others

### Stage 4: Default for New Paid Events

- all newly published paid EUR events use Connect checkout

### Stage 5: Full Primary-Sale Migration

- legacy Stripe session checkout retired for primary ticket sales

## 10. Testing Strategy

### Unit Tests

Add tests for:

- fee-rule resolution
- readiness validation
- webhook idempotency
- payment transaction finalization
- refund amount allocation

### Integration Tests

Add tests for:

- organizer onboarding state transitions
- Connect checkout order creation
- webhook success path
- duplicate webhook delivery
- payment failure path
- partial refund path

### Manual and Sandbox Tests

Validate in Stripe test mode:

- new Express account onboarding
- account with `charges_enabled = false`
- `payment_intent.succeeded`
- `payment_intent.payment_failed`
- `charge.refunded`
- `charge.dispute.created`

## 11. Operational Readiness Tasks

Before production rollout:

- configure Stripe Connect settings in dashboard
- create test and production webhook endpoints
- define support playbooks for action-required accounts
- define refund policy for application fee behavior
- define dispute-response ownership and SLAs
- create dashboard views for:
  - pending payments
  - failed webhook processing
  - action-required accounts
  - refund backlog
  - dispute backlog

## 12. Risks During Execution

### Risk 1: Schema Alignment Breaks Existing Prisma Usage

Mitigation:

- land schema alignment in its own branch or PR
- regenerate Prisma client and fix compile issues before behavioral changes

### Risk 2: Mixed Checkout Models Cause UI Drift

Mitigation:

- version checkout response contract
- gate Connect flows by event and keep response mappers explicit

### Risk 3: Duplicate Fulfillment During Dual-Run

Mitigation:

- centralize payment finalization guard on `payment_transactions`
- ensure issuance service checks for existing tickets

### Risk 4: Organizers Stuck Mid-Onboarding

Mitigation:

- implement refresh link early
- add status polling endpoint and actionable UI state

## 13. Suggested PR Sequence

Use this PR order:

1. `PR-1` Prisma schema alignment with existing payment migration
2. `PR-2` Connect schema extensions and dispute table
3. `PR-3` payment repositories and query models
4. `PR-4` Stripe Connect onboarding APIs and `account.updated`
5. `PR-5` event publish readiness checks
6. `PR-6` Connect checkout service and checkout response v2
7. `PR-7` webhook canonicalization for PaymentIntent lifecycle
8. `PR-8` refunds and partial refunds
9. `PR-9` disputes and organizer payout visibility
10. `PR-10` reconciliation jobs and legacy cleanup

## 14. Immediate Next Tasks

The best immediate execution order for this repo is:

1. align `prisma/schema.prisma` with the existing payment-domain migration
2. add the missing Connect-specific fields and `disputes`
3. introduce payment repositories and types
4. build organizer onboarding endpoints before touching checkout

## 15. Decision Checklist Before Coding

Confirm these before implementation starts:

1. Connect rollout is `EUR-only` for phase one
2. Connect checkout will use `PaymentIntents`, not Stripe Checkout Sessions
3. Stripe webhook success becomes the only trusted trigger for ticket issuance on Connect orders
4. Refund policy explicitly defines whether Maya refunds its application fee
5. Destination-charge dispute ownership is acceptable operationally

