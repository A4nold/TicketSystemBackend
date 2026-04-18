import { useLocalSearchParams } from "expo-router";

import { PublicEventScreen } from "@/features/public/public-event-screen";

export default function PublicEventRoute() {
  const params = useLocalSearchParams<{ slug?: string }>();
  return <PublicEventScreen slug={typeof params.slug === "string" ? params.slug : ""} />;
}
