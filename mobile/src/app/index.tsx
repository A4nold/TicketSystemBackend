import { Redirect } from "expo-router";

import { useAuth } from "@/components/providers/auth-provider";
import { DiscoveryScreen } from "@/features/public/discovery-screen";

export default function IndexScreen() {
  const { session } = useAuth();

  if (session) {
    return <Redirect href="/(tabs)/wallet" />;
  }

  return <DiscoveryScreen />;
}
