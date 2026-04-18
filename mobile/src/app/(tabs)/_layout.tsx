import { Redirect, Tabs } from "expo-router";

import { useAuth } from "@/components/providers/auth-provider";
import { palette } from "@/styles/theme";

export default function TabLayout() {
  const { session } = useAuth();

  if (!session) {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: {
          backgroundColor: palette.background,
        },
        tabBarActiveTintColor: palette.ink,
        tabBarInactiveTintColor: palette.muted,
      }}
    >
      <Tabs.Screen
        name="wallet/index"
        options={{
          tabBarLabel: "Wallet",
          title: "Wallet",
        }}
      />
      <Tabs.Screen
        name="activity"
        options={{
          tabBarLabel: "Activity",
          title: "Activity",
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          tabBarLabel: "Account",
          title: "Account",
        }}
      />
    </Tabs>
  );
}
