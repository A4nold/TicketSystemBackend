ALTER TABLE "events" ADD COLUMN "currency" TEXT NOT NULL DEFAULT 'EUR';

UPDATE "events" AS event
SET "currency" = COALESCE(
  (
    SELECT ticket_type."currency"
    FROM "ticket_types" AS ticket_type
    WHERE ticket_type."event_id" = event."id"
    ORDER BY ticket_type."sort_order" ASC, ticket_type."created_at" ASC
    LIMIT 1
  ),
  'EUR'
);
