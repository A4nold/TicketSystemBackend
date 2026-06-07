-- CreateEnum
CREATE TYPE "OrganizerOnboardingStatus" AS ENUM (
  'NOT_STARTED',
  'PROFILE_INCOMPLETE',
  'PROFILE_COMPLETED',
  'PAYMENT_SETUP_PENDING',
  'READY_FOR_PAID_EVENTS'
);

-- CreateTable
CREATE TABLE "organizer_profiles" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "display_name" TEXT,
  "business_name" TEXT,
  "country" TEXT,
  "default_payout_currency" TEXT,
  "onboarding_status" "OrganizerOnboardingStatus" NOT NULL DEFAULT 'NOT_STARTED',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "organizer_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "organizer_profiles_user_id_key"
  ON "organizer_profiles"("user_id");

-- CreateIndex
CREATE INDEX "organizer_profiles_country_default_payout_currency_idx"
  ON "organizer_profiles"("country", "default_payout_currency");

-- CreateIndex
CREATE INDEX "organizer_profiles_onboarding_status_updated_at_idx"
  ON "organizer_profiles"("onboarding_status", "updated_at");

-- AddForeignKey
ALTER TABLE "organizer_profiles"
  ADD CONSTRAINT "organizer_profiles_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
