import { Redirect } from "expo-router";

import { useAuth } from "@/components/providers/auth-provider";

export default function IndexScreen() {
  const { session } = useAuth();

  return <Redirect href={session ? "/(tabs)/wallet" : "/(auth)/login"} />;
}
