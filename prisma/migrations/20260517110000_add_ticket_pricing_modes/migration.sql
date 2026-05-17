-- CreateEnum
CREATE TYPE "TicketPricingMode" AS ENUM ('FIXED', 'FREE', 'OFFER_RANGE');

-- AlterTable
ALTER TABLE "ticket_types"
ADD COLUMN "pricing_mode" "TicketPricingMode" NOT NULL DEFAULT 'FIXED',
ADD COLUMN "min_offer_price" DECIMAL(10,2),
ADD COLUMN "max_offer_price" DECIMAL(10,2),
ADD COLUMN "offer_auto_expire_minutes" INTEGER NOT NULL DEFAULT 30;
