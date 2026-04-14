ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'POST_EVENT_PUBLISHED';

ALTER TABLE "events"
ADD COLUMN "post_event_message" TEXT,
ADD COLUMN "post_event_cta_label" TEXT,
ADD COLUMN "post_event_cta_url" TEXT,
ADD COLUMN "post_event_published_at" TIMESTAMP(3);
