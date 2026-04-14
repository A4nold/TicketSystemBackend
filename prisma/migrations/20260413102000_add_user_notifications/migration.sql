CREATE TYPE "NotificationType" AS ENUM (
  'TRANSFER_CREATED',
  'TRANSFER_RECEIVED',
  'TRANSFER_ACCEPTED',
  'TRANSFER_CANCELLED',
  'RESALE_LISTED',
  'RESALE_SOLD',
  'RESALE_CANCELLED'
);

CREATE TYPE "NotificationStatus" AS ENUM ('UNREAD', 'READ');

ALTER TABLE "transfer_requests"
ADD COLUMN "reminder_sent_at" TIMESTAMP(3);

CREATE TABLE "user_notifications" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "type" "NotificationType" NOT NULL,
  "status" "NotificationStatus" NOT NULL DEFAULT 'UNREAD',
  "title" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "action_url" TEXT,
  "metadata" JSONB,
  "read_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "user_notifications_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "user_notifications_user_id_status_created_at_idx"
ON "user_notifications"("user_id", "status", "created_at");

CREATE INDEX "user_notifications_type_created_at_idx"
ON "user_notifications"("type", "created_at");

ALTER TABLE "user_notifications"
ADD CONSTRAINT "user_notifications_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
