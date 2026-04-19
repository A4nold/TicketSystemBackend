ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'ORDER_PAID';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'TRANSFER_REMINDER';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'TRANSFER_EXPIRED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'EVENT_REMINDER';

CREATE TYPE "PushPlatform" AS ENUM ('IOS', 'ANDROID');
CREATE TYPE "PushDeviceStatus" AS ENUM ('ACTIVE', 'DISABLED', 'ERROR');

ALTER TABLE "events"
ADD COLUMN "pre_event_reminder_sent_at" TIMESTAMP(3);

CREATE TABLE "push_devices" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "expo_push_token" TEXT NOT NULL,
    "platform" "PushPlatform" NOT NULL,
    "status" "PushDeviceStatus" NOT NULL DEFAULT 'ACTIVE',
    "device_name" TEXT,
    "app_version" TEXT,
    "last_registered_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_delivered_at" TIMESTAMP(3),
    "last_error_at" TIMESTAMP(3),
    "last_error_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "push_devices_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "push_devices_expo_push_token_key" ON "push_devices"("expo_push_token");
CREATE INDEX "push_devices_user_id_status_idx" ON "push_devices"("user_id", "status");

ALTER TABLE "push_devices" ADD CONSTRAINT "push_devices_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
