ALTER TABLE "events"
ADD COLUMN "min_resale_price" DECIMAL(10,2),
ADD COLUMN "resale_royalty_percent" DECIMAL(5,2);

ALTER TABLE "resale_listings"
ADD COLUMN "organizer_royalty_amount" DECIMAL(10,2),
ADD COLUMN "seller_net_amount" DECIMAL(10,2);
