import { Redirect } from "expo-router";

import { useAuth } from "@/components/providers/auth-provider";
import { LoginScreen } from "@/features/auth/login-screen";

export default function LoginRoute() {
  const { session } = useAuth();

  if (session) {
    return <Redirect href="/(tabs)/wallet" />;
  }

  return <LoginScreen />;
}
