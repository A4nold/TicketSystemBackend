-- CreateEnum
CREATE TYPE "OrganizerProviderSelectionSource" AS ENUM (
  'AUTO_RECOMMENDED',
  'MANUAL'
);

-- AlterTable
ALTER TABLE "organizer_profiles"
  ADD COLUMN "selected_payment_provider" "PaymentProvider",
  ADD COLUMN "recommended_provider" "PaymentProvider",
  ADD COLUMN "provider_selection_source" "OrganizerProviderSelectionSource",
  ADD COLUMN "provider_selected_at" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "organizer_profiles_selected_payment_provider_updated_at_idx"
  ON "organizer_profiles"("selected_payment_provider", "updated_at");
