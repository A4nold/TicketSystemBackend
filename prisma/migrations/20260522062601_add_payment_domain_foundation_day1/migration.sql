-- CreateEnum
CREATE TYPE "PaymentAccountStatus" AS ENUM ('NOT_STARTED', 'PENDING', 'ACTION_REQUIRED', 'VERIFIED', 'RESTRICTED', 'DISABLED');

-- CreateEnum
CREATE TYPE "PaymentTransactionType" AS ENUM ('PRIMARY_TICKET_PURCHASE', 'RESALE_PURCHASE', 'REFUND', 'ADJUSTMENT');

-- CreateEnum
CREATE TYPE "PaymentTransactionStatus" AS ENUM ('PENDING', 'PROCESSING', 'SUCCEEDED', 'FAILED', 'CANCELLED', 'REQUIRES_ACTION');

-- CreateEnum
CREATE TYPE "SettlementState" AS ENUM ('NOT_APPLICABLE', 'PENDING', 'IN_TRANSIT', 'SETTLED', 'FAILED', 'ON_HOLD');

-- CreateEnum
CREATE TYPE "RefundStatus" AS ENUM ('REQUESTED', 'PROCESSING', 'SUCCEEDED', 'FAILED', 'CANCELLED');

-- AlterTable
ALTER TABLE "payout_records"
  ADD COLUMN "expected_settlement_at" TIMESTAMP(3),
  ADD COLUMN "settled_at" TIMESTAMP(3),
  ADD COLUMN "settlement_reference" TEXT,
  ADD COLUMN "settlement_state" "SettlementState" NOT NULL DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "webhook_events"
  ADD COLUMN "delivery_attempts" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "last_attempt_at" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "organizer_payment_profiles" (
  "id" TEXT NOT NULL,
  "organizer_id" TEXT NOT NULL,
  "default_settlement_currency" TEXT,
  "is_ready_for_paid_events" BOOLEAN NOT NULL DEFAULT false,
  "readiness_checked_at" TIMESTAMP(3),
  "first_ready_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "organizer_payment_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_accounts" (
  "id" TEXT NOT NULL,
  "organizer_id" TEXT NOT NULL,
  "provider" "PaymentProvider" NOT NULL,
  "status" "PaymentAccountStatus" NOT NULL DEFAULT 'NOT_STARTED',
  "external_account_id" TEXT NOT NULL,
  "external_account_code" TEXT,
  "payouts_enabled" BOOLEAN NOT NULL DEFAULT false,
  "charges_enabled" BOOLEAN NOT NULL DEFAULT false,
  "onboarding_completed_at" TIMESTAMP(3),
  "requirements_due_by" TIMESTAMP(3),
  "requirements_summary" TEXT,
  "disabled_reason" TEXT,
  "metadata" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "payment_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_transactions" (
  "id" TEXT NOT NULL,
  "event_id" TEXT NOT NULL,
  "order_id" TEXT,
  "resale_listing_id" TEXT,
  "provider" "PaymentProvider" NOT NULL,
  "type" "PaymentTransactionType" NOT NULL DEFAULT 'PRIMARY_TICKET_PURCHASE',
  "status" "PaymentTransactionStatus" NOT NULL DEFAULT 'PENDING',
  "provider_reference" TEXT NOT NULL,
  "provider_checkout_id" TEXT,
  "provider_payment_intent_id" TEXT,
  "amount" DECIMAL(10,2) NOT NULL,
  "currency" TEXT NOT NULL,
  "gross_amount" DECIMAL(10,2) NOT NULL,
  "platform_fee_amount" DECIMAL(10,2) NOT NULL DEFAULT 0,
  "organizer_net_amount" DECIMAL(10,2) NOT NULL DEFAULT 0,
  "settlement_state" "SettlementState" NOT NULL DEFAULT 'PENDING',
  "settled_at" TIMESTAMP(3),
  "failed_at" TIMESTAMP(3),
  "failure_reason" TEXT,
  "metadata" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "payment_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_fees" (
  "id" TEXT NOT NULL,
  "payment_transaction_id" TEXT NOT NULL,
  "amount" DECIMAL(10,2) NOT NULL,
  "currency" TEXT NOT NULL,
  "responsibility" TEXT NOT NULL DEFAULT 'BUYER',
  "model" TEXT NOT NULL DEFAULT 'BLENDED',
  "percent_rate" DECIMAL(10,6),
  "fixed_amount" DECIMAL(10,2),
  "metadata" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "platform_fees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organizer_earnings" (
  "id" TEXT NOT NULL,
  "organizer_id" TEXT NOT NULL,
  "event_id" TEXT NOT NULL,
  "order_id" TEXT,
  "resale_listing_id" TEXT,
  "payment_transaction_id" TEXT NOT NULL,
  "gross_amount" DECIMAL(10,2) NOT NULL,
  "platform_fee_amount" DECIMAL(10,2) NOT NULL DEFAULT 0,
  "net_amount" DECIMAL(10,2) NOT NULL,
  "currency" TEXT NOT NULL,
  "settlement_state" "SettlementState" NOT NULL DEFAULT 'PENDING',
  "settled_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "organizer_earnings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refunds" (
  "id" TEXT NOT NULL,
  "order_id" TEXT,
  "payment_transaction_id" TEXT,
  "provider" "PaymentProvider" NOT NULL,
  "status" "RefundStatus" NOT NULL DEFAULT 'REQUESTED',
  "provider_refund_id" TEXT,
  "amount" DECIMAL(10,2) NOT NULL,
  "currency" TEXT NOT NULL,
  "reason" TEXT,
  "requested_by_user_id" TEXT,
  "requested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "processed_at" TIMESTAMP(3),
  "failed_at" TIMESTAMP(3),
  "failure_reason" TEXT,
  "metadata" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "refunds_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "organizer_payment_profiles_organizer_id_key" ON "organizer_payment_profiles"("organizer_id");

-- CreateIndex
CREATE INDEX "organizer_payment_profiles_is_ready_for_paid_events_updated_at_idx" ON "organizer_payment_profiles"("is_ready_for_paid_events", "updated_at");

-- CreateIndex
CREATE UNIQUE INDEX "payment_accounts_provider_external_account_id_key" ON "payment_accounts"("provider", "external_account_id");

-- CreateIndex
CREATE UNIQUE INDEX "payment_accounts_organizer_id_provider_key" ON "payment_accounts"("organizer_id", "provider");

-- CreateIndex
CREATE INDEX "payment_accounts_status_updated_at_idx" ON "payment_accounts"("status", "updated_at");

-- CreateIndex
CREATE UNIQUE INDEX "payment_transactions_provider_provider_reference_key" ON "payment_transactions"("provider", "provider_reference");

-- CreateIndex
CREATE INDEX "payment_transactions_order_id_idx" ON "payment_transactions"("order_id");

-- CreateIndex
CREATE INDEX "payment_transactions_resale_listing_id_idx" ON "payment_transactions"("resale_listing_id");

-- CreateIndex
CREATE INDEX "payment_transactions_event_id_status_created_at_idx" ON "payment_transactions"("event_id", "status", "created_at");

-- CreateIndex
CREATE INDEX "platform_fees_payment_transaction_id_idx" ON "platform_fees"("payment_transaction_id");

-- CreateIndex
CREATE INDEX "organizer_earnings_organizer_id_settlement_state_created_at_idx" ON "organizer_earnings"("organizer_id", "settlement_state", "created_at");

-- CreateIndex
CREATE INDEX "organizer_earnings_event_id_created_at_idx" ON "organizer_earnings"("event_id", "created_at");

-- CreateIndex
CREATE INDEX "organizer_earnings_order_id_idx" ON "organizer_earnings"("order_id");

-- CreateIndex
CREATE INDEX "organizer_earnings_resale_listing_id_idx" ON "organizer_earnings"("resale_listing_id");

-- CreateIndex
CREATE INDEX "organizer_earnings_payment_transaction_id_idx" ON "organizer_earnings"("payment_transaction_id");

-- CreateIndex
CREATE UNIQUE INDEX "refunds_provider_provider_refund_id_key" ON "refunds"("provider", "provider_refund_id");

-- CreateIndex
CREATE INDEX "refunds_order_id_created_at_idx" ON "refunds"("order_id", "created_at");

-- CreateIndex
CREATE INDEX "refunds_payment_transaction_id_created_at_idx" ON "refunds"("payment_transaction_id", "created_at");

-- CreateIndex
CREATE INDEX "refunds_status_created_at_idx" ON "refunds"("status", "created_at");

-- AddForeignKey
ALTER TABLE "organizer_payment_profiles" ADD CONSTRAINT "organizer_payment_profiles_organizer_id_fkey" FOREIGN KEY ("organizer_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_accounts" ADD CONSTRAINT "payment_accounts_organizer_id_fkey" FOREIGN KEY ("organizer_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_resale_listing_id_fkey" FOREIGN KEY ("resale_listing_id") REFERENCES "resale_listings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_fees" ADD CONSTRAINT "platform_fees_payment_transaction_id_fkey" FOREIGN KEY ("payment_transaction_id") REFERENCES "payment_transactions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organizer_earnings" ADD CONSTRAINT "organizer_earnings_organizer_id_fkey" FOREIGN KEY ("organizer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organizer_earnings" ADD CONSTRAINT "organizer_earnings_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organizer_earnings" ADD CONSTRAINT "organizer_earnings_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organizer_earnings" ADD CONSTRAINT "organizer_earnings_resale_listing_id_fkey" FOREIGN KEY ("resale_listing_id") REFERENCES "resale_listings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organizer_earnings" ADD CONSTRAINT "organizer_earnings_payment_transaction_id_fkey" FOREIGN KEY ("payment_transaction_id") REFERENCES "payment_transactions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_payment_transaction_id_fkey" FOREIGN KEY ("payment_transaction_id") REFERENCES "payment_transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
