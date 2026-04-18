import { useLocalSearchParams } from "expo-router";

import { TicketDetailScreen } from "@/features/tickets/ticket-detail-screen";

export default function TicketDetailRoute() {
  const params = useLocalSearchParams<{ serialNumber: string }>();

  return <TicketDetailScreen serialNumber={params.serialNumber} />;
}
