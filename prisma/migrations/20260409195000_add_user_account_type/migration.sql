CREATE TYPE "AccountType" AS ENUM ('ATTENDEE', 'ORGANIZER');

ALTER TABLE "users"
ADD COLUMN "account_type" "AccountType" NOT NULL DEFAULT 'ATTENDEE';

UPDATE "users"
SET "account_type" = 'ORGANIZER'
WHERE "email" = 'organizer@campusnight.ie'
   OR "id" IN (SELECT "organizer_id" FROM "events");
