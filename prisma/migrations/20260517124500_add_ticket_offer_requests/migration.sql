-- CreateEnum
CREATE TYPE "TicketOfferRequestStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'CANCELLED');

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'OFFER_REQUEST_RECEIVED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'OFFER_REQUEST_ACCEPTED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'OFFER_REQUEST_REJECTED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'OFFER_REQUEST_EXPIRED';

-- CreateTable
CREATE TABLE "ticket_offer_requests" (
  "id" TEXT NOT NULL,
  "event_id" TEXT NOT NULL,
  "ticket_type_id" TEXT NOT NULL,
  "attendee_user_id" TEXT NOT NULL,
  "offered_price" DECIMAL(10,2) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'EUR',
  "status" "TicketOfferRequestStatus" NOT NULL DEFAULT 'PENDING',
  "organizer_note" TEXT,
  "reviewed_by_user_id" TEXT,
  "reviewed_at" TIMESTAMP(3),
  "expires_at" TIMESTAMP(3) NOT NULL,
  "checkout_unlock_token" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ticket_offer_requests_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE INDEX "ticket_offer_requests_event_id_status_created_at_idx" ON "ticket_offer_requests"("event_id", "status", "created_at");
CREATE INDEX "ticket_offer_requests_ticket_type_id_status_idx" ON "ticket_offer_requests"("ticket_type_id", "status");
CREATE INDEX "ticket_offer_requests_attendee_user_id_status_created_at_idx" ON "ticket_offer_requests"("attendee_user_id", "status", "created_at");
CREATE INDEX "ticket_offer_requests_expires_at_status_idx" ON "ticket_offer_requests"("expires_at", "status");

-- Foreign keys
ALTER TABLE "ticket_offer_requests" ADD CONSTRAINT "ticket_offer_requests_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ticket_offer_requests" ADD CONSTRAINT "ticket_offer_requests_ticket_type_id_fkey" FOREIGN KEY ("ticket_type_id") REFERENCES "ticket_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ticket_offer_requests" ADD CONSTRAINT "ticket_offer_requests_attendee_user_id_fkey" FOREIGN KEY ("attendee_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ticket_offer_requests" ADD CONSTRAINT "ticket_offer_requests_reviewed_by_user_id_fkey" FOREIGN KEY ("reviewed_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
