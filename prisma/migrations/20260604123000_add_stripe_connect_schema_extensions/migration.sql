-- CreateEnum
CREATE TYPE "ConnectedAccountType" AS ENUM ('EXPRESS', 'STANDARD', 'CUSTOM');

-- CreateEnum
CREATE TYPE "PaymentAccountOnboardingStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'ACTION_REQUIRED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "PaymentVerificationStatus" AS ENUM ('UNVERIFIED', 'PENDING', 'VERIFIED', 'RESTRICTED', 'DISABLED');

-- CreateEnum
CREATE TYPE "FixedFeeApplication" AS ENUM ('PER_ORDER', 'PER_TICKET');

-- AlterTable
ALTER TABLE "payment_accounts"
  ADD COLUMN "account_type" "ConnectedAccountType",
  ADD COLUMN "verification_status" "PaymentVerificationStatus" NOT NULL DEFAULT 'UNVERIFIED',
  ADD COLUMN "onboarding_status" "PaymentAccountOnboardingStatus" NOT NULL DEFAULT 'NOT_STARTED',
  ADD COLUMN "details_submitted" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "country" TEXT,
  ADD COLUMN "default_currency" TEXT,
  ADD COLUMN "currently_due_requirements" TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "eventually_due_requirements" TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "past_due_requirements" TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "last_synced_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "payment_transactions"
  ADD COLUMN "organizer_id" TEXT,
  ADD COLUMN "provider_charge_id" TEXT,
  ADD COLUMN "provider_transfer_id" TEXT,
  ADD COLUMN "provider_application_fee_id" TEXT,
  ADD COLUMN "connected_account_id" TEXT,
  ADD COLUMN "idempotency_key" TEXT,
  ADD COLUMN "captured_at" TIMESTAMP(3),
  ADD COLUMN "canceled_at" TIMESTAMP(3);

-- Backfill organizer_id from event ownership before enforcing NOT NULL
UPDATE "payment_transactions" pt
SET "organizer_id" = e."organizer_id"
FROM "events" e
WHERE pt."event_id" = e."id"
  AND pt."organizer_id" IS NULL;

ALTER TABLE "payment_transactions"
  ALTER COLUMN "organizer_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "platform_fees"
  ADD COLUMN "fixed_fee_application" "FixedFeeApplication",
  ADD COLUMN "pricing_rule_id" TEXT,
  ADD COLUMN "pricing_rule_snapshot" JSONB;

-- AlterTable
ALTER TABLE "refunds"
  ADD COLUMN "provider_reversal_id" TEXT,
  ADD COLUMN "reverse_transfer" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "refund_application_fee" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "disputes" (
  "id" TEXT NOT NULL,
  "payment_transaction_id" TEXT NOT NULL,
  "provider" "PaymentProvider" NOT NULL,
  "provider_dispute_id" TEXT NOT NULL,
  "provider_charge_id" TEXT,
  "amount" DECIMAL(10,2) NOT NULL,
  "currency" TEXT NOT NULL,
  "reason" TEXT,
  "status" TEXT NOT NULL,
  "evidence_due_by" TIMESTAMP(3),
  "needs_response" BOOLEAN NOT NULL DEFAULT false,
  "won_at" TIMESTAMP(3),
  "lost_at" TIMESTAMP(3),
  "closed_at" TIMESTAMP(3),
  "metadata" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "disputes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "payment_transactions_provider_provider_payment_intent_id_key"
  ON "payment_transactions"("provider", "provider_payment_intent_id");

-- CreateIndex
CREATE UNIQUE INDEX "payment_transactions_provider_provider_charge_id_key"
  ON "payment_transactions"("provider", "provider_charge_id");

-- CreateIndex
CREATE INDEX "payment_transactions_organizer_id_created_at_idx"
  ON "payment_transactions"("organizer_id", "created_at");

-- CreateIndex
CREATE INDEX "payment_transactions_connected_account_id_created_at_idx"
  ON "payment_transactions"("connected_account_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "disputes_provider_provider_dispute_id_key"
  ON "disputes"("provider", "provider_dispute_id");

-- CreateIndex
CREATE INDEX "disputes_payment_transaction_id_idx"
  ON "disputes"("payment_transaction_id");

-- CreateIndex
CREATE INDEX "disputes_provider_charge_id_idx"
  ON "disputes"("provider_charge_id");

-- CreateIndex
CREATE INDEX "disputes_status_created_at_idx"
  ON "disputes"("status", "created_at");

-- AddForeignKey
ALTER TABLE "payment_transactions"
  ADD CONSTRAINT "payment_transactions_organizer_id_fkey"
  FOREIGN KEY ("organizer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disputes"
  ADD CONSTRAINT "disputes_payment_transaction_id_fkey"
  FOREIGN KEY ("payment_transaction_id") REFERENCES "payment_transactions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
