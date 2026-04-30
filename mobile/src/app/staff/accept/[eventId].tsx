import { Redirect, useLocalSearchParams } from "expo-router";

import { useAuth } from "@/components/providers/auth-provider";
import { StaffInviteAcceptanceScreen } from "@/features/staff/staff-invite-acceptance-screen";

export default function StaffAcceptRoute() {
  const { session } = useAuth();
  const params = useLocalSearchParams<{ eventId?: string }>();
  const eventId = typeof params.eventId === "string" ? params.eventId.trim() : "";

  if (!session) {
    return <Redirect href="/(auth)/login" />;
  }

  if (!eventId) {
    return <Redirect href="/activity" />;
  }

  return <StaffInviteAcceptanceScreen eventId={eventId} />;
}
