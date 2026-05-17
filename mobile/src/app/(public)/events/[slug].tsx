import { useLocalSearchParams } from "expo-router";

import { PublicEventScreen } from "@/features/public/public-event-screen";

export default function PublicEventRoute() {
  const params = useLocalSearchParams<{
    offerPrice?: string;
    quantity?: string;
    slug?: string;
    ticketTypeId?: string;
  }>();
  const initialQuantity = Number(params.quantity ?? "");
  const initialOfferPrice = Number(params.offerPrice ?? "");

  return (
    <PublicEventScreen
      initialOfferPrice={
        Number.isFinite(initialOfferPrice) && initialOfferPrice > 0
          ? initialOfferPrice
          : undefined
      }
      initialQuantity={
        Number.isFinite(initialQuantity) && initialQuantity >= 1
          ? initialQuantity
          : undefined
      }
      initialTicketTypeId={
        typeof params.ticketTypeId === "string" ? params.ticketTypeId : undefined
      }
      slug={typeof params.slug === "string" ? params.slug : ""}
    />
  );
}
