-- CreateEnum
CREATE TYPE "EventShareAction" AS ENUM (
  'EVENT_SHARE_CLICKED',
  'EVENT_LINK_COPIED',
  'EVENT_FLYER_GENERATED',
  'EVENT_FLYER_DOWNLOADED',
  'PUBLIC_EVENT_PAGE_VIEWED',
  'GET_TICKET_FROM_PUBLIC_PAGE_CLICKED'
);

-- AlterTable
ALTER TABLE "events"
ADD COLUMN "share_headline" TEXT,
ADD COLUMN "share_description" TEXT,
ADD COLUMN "share_image_url" TEXT;

-- CreateTable
CREATE TABLE "event_share_analytics" (
  "id" TEXT NOT NULL,
  "event_id" TEXT NOT NULL,
  "event_slug" TEXT NOT NULL,
  "event_name" TEXT NOT NULL,
  "event_action" "EventShareAction" NOT NULL,
  "source_surface" TEXT NOT NULL,
  "user_id" TEXT,
  "session_id" TEXT,
  "metadata" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "event_share_analytics_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "event_share_analytics_event_id_created_at_idx"
ON "event_share_analytics"("event_id", "created_at");

-- CreateIndex
CREATE INDEX "event_share_analytics_event_action_created_at_idx"
ON "event_share_analytics"("event_action", "created_at");

-- CreateIndex
CREATE INDEX "event_share_analytics_source_surface_created_at_idx"
ON "event_share_analytics"("source_surface", "created_at");

-- AddForeignKey
ALTER TABLE "event_share_analytics"
ADD CONSTRAINT "event_share_analytics_event_id_fkey"
FOREIGN KEY ("event_id") REFERENCES "events"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_share_analytics"
ADD CONSTRAINT "event_share_analytics_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
