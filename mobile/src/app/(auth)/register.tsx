import { Redirect, useLocalSearchParams } from "expo-router";

import { useAuth } from "@/components/providers/auth-provider";
import { AuthScreen } from "@/features/auth/auth-screen";

export default function RegisterRoute() {
  const { session } = useAuth();
  const params = useLocalSearchParams<{
    eventSlug?: string;
    quantity?: string;
    ticketTypeId?: string;
  }>();

  if (session) {
    if (
      typeof params.eventSlug === "string" &&
      params.eventSlug &&
      typeof params.ticketTypeId === "string" &&
      params.ticketTypeId
    ) {
      return (
        <Redirect
          href={{
            pathname: "/checkout/start",
            params: {
              eventSlug: params.eventSlug,
              quantity: typeof params.quantity === "string" ? params.quantity : "1",
              ticketTypeId: params.ticketTypeId,
            },
          }}
        />
      );
    }

    return <Redirect href="/(tabs)/wallet" />;
  }

  return <AuthScreen defaultMode="register" />;
}
