-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'DELETED');

-- CreateEnum
CREATE TYPE "EventStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'SALES_CLOSED', 'LIVE', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TicketStatus" AS ENUM ('RESERVED', 'PAID', 'ISSUED', 'TRANSFER_PENDING', 'RESALE_LISTED', 'USED', 'CANCELLED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'PAID', 'FAILED', 'CANCELLED', 'REFUNDED', 'PARTIALLY_REFUNDED');

-- CreateEnum
CREATE TYPE "TransferStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'CANCELLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "ResaleStatus" AS ENUM ('DRAFT', 'LISTED', 'SOLD', 'CANCELLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "ScanOutcome" AS ENUM ('VALID', 'ALREADY_USED', 'INVALID', 'BLOCKED');

-- CreateEnum
CREATE TYPE "ScanMode" AS ENUM ('ONLINE', 'OFFLINE_SYNC');

-- CreateEnum
CREATE TYPE "StaffRole" AS ENUM ('OWNER', 'ADMIN', 'SCANNER');

-- CreateEnum
CREATE TYPE "PaymentProvider" AS ENUM ('STRIPE', 'PAYSTACK', 'MANUAL');

-- CreateEnum
CREATE TYPE "PayoutStatus" AS ENUM ('PENDING', 'PROCESSING', 'PAID', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "OwnershipChangeType" AS ENUM ('PURCHASE', 'TRANSFER_OUT', 'TRANSFER_IN', 'RESALE_LISTED', 'RESALE_PURCHASE', 'ORGANIZER_REASSIGNMENT', 'REFUND', 'CANCELLATION');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "last_login_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_profiles" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "first_name" TEXT,
    "last_name" TEXT,
    "phone_number" TEXT,
    "avatar_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "events" (
    "id" TEXT NOT NULL,
    "organizer_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "venue_name" TEXT,
    "venue_address" TEXT,
    "timezone" TEXT NOT NULL,
    "starts_at" TIMESTAMP(3) NOT NULL,
    "ends_at" TIMESTAMP(3),
    "status" "EventStatus" NOT NULL DEFAULT 'DRAFT',
    "cover_image_url" TEXT,
    "sales_start_at" TIMESTAMP(3),
    "sales_end_at" TIMESTAMP(3),
    "allow_resale" BOOLEAN NOT NULL DEFAULT false,
    "max_resale_price" DECIMAL(10,2),
    "resale_starts_at" TIMESTAMP(3),
    "resale_ends_at" TIMESTAMP(3),
    "offline_manifest_salt" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ticket_types" (
    "id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "quantity" INTEGER NOT NULL,
    "max_per_order" INTEGER,
    "sale_starts_at" TIMESTAMP(3),
    "sale_ends_at" TIMESTAMP(3),
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ticket_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "subtotal_amount" DECIMAL(10,2) NOT NULL,
    "fee_amount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "total_amount" DECIMAL(10,2) NOT NULL,
    "payment_provider" "PaymentProvider" NOT NULL DEFAULT 'STRIPE',
    "payment_reference" TEXT,
    "checkout_session_id" TEXT,
    "idempotency_key" TEXT,
    "paid_at" TIMESTAMP(3),
    "cancelled_at" TIMESTAMP(3),
    "refunded_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_items" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "ticket_type_id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unit_price" DECIMAL(10,2) NOT NULL,
    "total_price" DECIMAL(10,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tickets" (
    "id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "ticket_type_id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "current_owner_id" TEXT NOT NULL,
    "status" "TicketStatus" NOT NULL DEFAULT 'ISSUED',
    "serial_number" TEXT NOT NULL,
    "qr_token_id" TEXT NOT NULL,
    "ownership_revision" INTEGER NOT NULL DEFAULT 1,
    "issued_at" TIMESTAMP(3),
    "reserved_until" TIMESTAMP(3),
    "used_at" TIMESTAMP(3),
    "cancelled_at" TIMESTAMP(3),
    "refunded_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ticket_ownership_history" (
    "id" TEXT NOT NULL,
    "ticket_id" TEXT NOT NULL,
    "from_user_id" TEXT,
    "to_user_id" TEXT,
    "change_type" "OwnershipChangeType" NOT NULL,
    "revision" INTEGER NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ticket_ownership_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transfer_requests" (
    "id" TEXT NOT NULL,
    "ticket_id" TEXT NOT NULL,
    "sender_user_id" TEXT NOT NULL,
    "recipient_user_id" TEXT,
    "recipient_email" TEXT,
    "status" "TransferStatus" NOT NULL DEFAULT 'PENDING',
    "transfer_token" TEXT NOT NULL,
    "message" TEXT,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "accepted_at" TIMESTAMP(3),
    "cancelled_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transfer_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resale_listings" (
    "id" TEXT NOT NULL,
    "ticket_id" TEXT NOT NULL,
    "seller_user_id" TEXT NOT NULL,
    "buyer_user_id" TEXT,
    "event_id" TEXT NOT NULL,
    "asking_price" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "status" "ResaleStatus" NOT NULL DEFAULT 'DRAFT',
    "payment_provider" "PaymentProvider" NOT NULL DEFAULT 'STRIPE',
    "sale_reference" TEXT,
    "listed_at" TIMESTAMP(3),
    "sold_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),
    "cancelled_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "resale_listings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "staff_memberships" (
    "id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "role" "StaffRole" NOT NULL,
    "invited_at" TIMESTAMP(3),
    "accepted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "staff_memberships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scan_sessions" (
    "id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "staff_membership_id" TEXT,
    "started_by_user_id" TEXT,
    "device_label" TEXT,
    "device_fingerprint" TEXT,
    "mode" "ScanMode" NOT NULL DEFAULT 'ONLINE',
    "manifest_version" INTEGER,
    "last_synced_at" TIMESTAMP(3),
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ended_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scan_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scan_attempts" (
    "id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "ticket_id" TEXT,
    "scan_session_id" TEXT,
    "staff_membership_id" TEXT,
    "scanned_by_user_id" TEXT,
    "scanned_qr_token_id" TEXT,
    "scanned_revision" INTEGER,
    "outcome" "ScanOutcome" NOT NULL,
    "reason_code" TEXT,
    "scanned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "device_recorded_at" TIMESTAMP(3),
    "offline_queued_at" TIMESTAMP(3),
    "synced_at" TIMESTAMP(3),
    "metadata" JSONB,

    CONSTRAINT "scan_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payout_records" (
    "id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "order_id" TEXT,
    "resale_listing_id" TEXT,
    "payment_provider" "PaymentProvider" NOT NULL DEFAULT 'STRIPE',
    "payout_reference" TEXT,
    "gross_amount" DECIMAL(10,2) NOT NULL,
    "fee_amount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "net_amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "status" "PayoutStatus" NOT NULL DEFAULT 'PENDING',
    "scheduled_at" TIMESTAMP(3),
    "paid_at" TIMESTAMP(3),
    "failed_at" TIMESTAMP(3),
    "failure_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payout_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webhook_events" (
    "id" TEXT NOT NULL,
    "event_id" TEXT,
    "provider" "PaymentProvider" NOT NULL DEFAULT 'STRIPE',
    "provider_event_id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "processed_at" TIMESTAMP(3),
    "processing_error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "webhook_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "user_profiles_user_id_key" ON "user_profiles"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "events_slug_key" ON "events"("slug");

-- CreateIndex
CREATE INDEX "events_organizer_id_status_idx" ON "events"("organizer_id", "status");

-- CreateIndex
CREATE INDEX "events_starts_at_idx" ON "events"("starts_at");

-- CreateIndex
CREATE INDEX "ticket_types_event_id_is_active_idx" ON "ticket_types"("event_id", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "orders_payment_reference_key" ON "orders"("payment_reference");

-- CreateIndex
CREATE UNIQUE INDEX "orders_checkout_session_id_key" ON "orders"("checkout_session_id");

-- CreateIndex
CREATE UNIQUE INDEX "orders_idempotency_key_key" ON "orders"("idempotency_key");

-- CreateIndex
CREATE INDEX "orders_user_id_created_at_idx" ON "orders"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "orders_event_id_status_idx" ON "orders"("event_id", "status");

-- CreateIndex
CREATE INDEX "order_items_order_id_idx" ON "order_items"("order_id");

-- CreateIndex
CREATE INDEX "order_items_ticket_type_id_idx" ON "order_items"("ticket_type_id");

-- CreateIndex
CREATE UNIQUE INDEX "tickets_serial_number_key" ON "tickets"("serial_number");

-- CreateIndex
CREATE UNIQUE INDEX "tickets_qr_token_id_key" ON "tickets"("qr_token_id");

-- CreateIndex
CREATE INDEX "tickets_event_id_status_idx" ON "tickets"("event_id", "status");

-- CreateIndex
CREATE INDEX "tickets_current_owner_id_status_idx" ON "tickets"("current_owner_id", "status");

-- CreateIndex
CREATE INDEX "tickets_ticket_type_id_idx" ON "tickets"("ticket_type_id");

-- CreateIndex
CREATE INDEX "ticket_ownership_history_ticket_id_revision_idx" ON "ticket_ownership_history"("ticket_id", "revision");

-- CreateIndex
CREATE INDEX "ticket_ownership_history_from_user_id_idx" ON "ticket_ownership_history"("from_user_id");

-- CreateIndex
CREATE INDEX "ticket_ownership_history_to_user_id_idx" ON "ticket_ownership_history"("to_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "transfer_requests_transfer_token_key" ON "transfer_requests"("transfer_token");

-- CreateIndex
CREATE INDEX "transfer_requests_ticket_id_status_idx" ON "transfer_requests"("ticket_id", "status");

-- CreateIndex
CREATE INDEX "transfer_requests_sender_user_id_status_idx" ON "transfer_requests"("sender_user_id", "status");

-- CreateIndex
CREATE INDEX "transfer_requests_recipient_user_id_status_idx" ON "transfer_requests"("recipient_user_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "resale_listings_sale_reference_key" ON "resale_listings"("sale_reference");

-- CreateIndex
CREATE INDEX "resale_listings_ticket_id_status_idx" ON "resale_listings"("ticket_id", "status");

-- CreateIndex
CREATE INDEX "resale_listings_event_id_status_idx" ON "resale_listings"("event_id", "status");

-- CreateIndex
CREATE INDEX "resale_listings_seller_user_id_status_idx" ON "resale_listings"("seller_user_id", "status");

-- CreateIndex
CREATE INDEX "staff_memberships_user_id_role_idx" ON "staff_memberships"("user_id", "role");

-- CreateIndex
CREATE UNIQUE INDEX "staff_memberships_event_id_user_id_key" ON "staff_memberships"("event_id", "user_id");

-- CreateIndex
CREATE INDEX "scan_sessions_event_id_started_at_idx" ON "scan_sessions"("event_id", "started_at");

-- CreateIndex
CREATE INDEX "scan_sessions_device_fingerprint_idx" ON "scan_sessions"("device_fingerprint");

-- CreateIndex
CREATE INDEX "scan_attempts_event_id_scanned_at_idx" ON "scan_attempts"("event_id", "scanned_at");

-- CreateIndex
CREATE INDEX "scan_attempts_ticket_id_scanned_at_idx" ON "scan_attempts"("ticket_id", "scanned_at");

-- CreateIndex
CREATE INDEX "scan_attempts_scan_session_id_scanned_at_idx" ON "scan_attempts"("scan_session_id", "scanned_at");

-- CreateIndex
CREATE INDEX "scan_attempts_outcome_scanned_at_idx" ON "scan_attempts"("outcome", "scanned_at");

-- CreateIndex
CREATE UNIQUE INDEX "payout_records_payout_reference_key" ON "payout_records"("payout_reference");

-- CreateIndex
CREATE INDEX "payout_records_event_id_status_idx" ON "payout_records"("event_id", "status");

-- CreateIndex
CREATE INDEX "payout_records_order_id_idx" ON "payout_records"("order_id");

-- CreateIndex
CREATE INDEX "payout_records_resale_listing_id_idx" ON "payout_records"("resale_listing_id");

-- CreateIndex
CREATE UNIQUE INDEX "webhook_events_provider_event_id_key" ON "webhook_events"("provider_event_id");

-- CreateIndex
CREATE INDEX "webhook_events_event_id_created_at_idx" ON "webhook_events"("event_id", "created_at");

-- CreateIndex
CREATE INDEX "webhook_events_provider_event_type_idx" ON "webhook_events"("provider", "event_type");

-- AddForeignKey
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_organizer_id_fkey" FOREIGN KEY ("organizer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_types" ADD CONSTRAINT "ticket_types_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_ticket_type_id_fkey" FOREIGN KEY ("ticket_type_id") REFERENCES "ticket_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_ticket_type_id_fkey" FOREIGN KEY ("ticket_type_id") REFERENCES "ticket_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_current_owner_id_fkey" FOREIGN KEY ("current_owner_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_ownership_history" ADD CONSTRAINT "ticket_ownership_history_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_ownership_history" ADD CONSTRAINT "ticket_ownership_history_from_user_id_fkey" FOREIGN KEY ("from_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_ownership_history" ADD CONSTRAINT "ticket_ownership_history_to_user_id_fkey" FOREIGN KEY ("to_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfer_requests" ADD CONSTRAINT "transfer_requests_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfer_requests" ADD CONSTRAINT "transfer_requests_sender_user_id_fkey" FOREIGN KEY ("sender_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfer_requests" ADD CONSTRAINT "transfer_requests_recipient_user_id_fkey" FOREIGN KEY ("recipient_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resale_listings" ADD CONSTRAINT "resale_listings_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "tickets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resale_listings" ADD CONSTRAINT "resale_listings_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resale_listings" ADD CONSTRAINT "resale_listings_seller_user_id_fkey" FOREIGN KEY ("seller_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resale_listings" ADD CONSTRAINT "resale_listings_buyer_user_id_fkey" FOREIGN KEY ("buyer_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_memberships" ADD CONSTRAINT "staff_memberships_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_memberships" ADD CONSTRAINT "staff_memberships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scan_sessions" ADD CONSTRAINT "scan_sessions_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scan_sessions" ADD CONSTRAINT "scan_sessions_staff_membership_id_fkey" FOREIGN KEY ("staff_membership_id") REFERENCES "staff_memberships"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scan_sessions" ADD CONSTRAINT "scan_sessions_started_by_user_id_fkey" FOREIGN KEY ("started_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scan_attempts" ADD CONSTRAINT "scan_attempts_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scan_attempts" ADD CONSTRAINT "scan_attempts_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "tickets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scan_attempts" ADD CONSTRAINT "scan_attempts_scan_session_id_fkey" FOREIGN KEY ("scan_session_id") REFERENCES "scan_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scan_attempts" ADD CONSTRAINT "scan_attempts_staff_membership_id_fkey" FOREIGN KEY ("staff_membership_id") REFERENCES "staff_memberships"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scan_attempts" ADD CONSTRAINT "scan_attempts_scanned_by_user_id_fkey" FOREIGN KEY ("scanned_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payout_records" ADD CONSTRAINT "payout_records_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payout_records" ADD CONSTRAINT "payout_records_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payout_records" ADD CONSTRAINT "payout_records_resale_listing_id_fkey" FOREIGN KEY ("resale_listing_id") REFERENCES "resale_listings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "webhook_events" ADD CONSTRAINT "webhook_events_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE SET NULL ON UPDATE CASCADE;
