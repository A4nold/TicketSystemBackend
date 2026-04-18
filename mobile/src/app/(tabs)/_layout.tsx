import { Redirect, Tabs } from "expo-router";

import { useAuth } from "@/components/providers/auth-provider";
import { hasOrganizerSurfaceAccess } from "@/features/auth/organizer-access";
import { hasScannerSurfaceAccess } from "@/features/auth/scanner-access";
import { palette } from "@/styles/theme";

export default function TabLayout() {
  const { session } = useAuth();

  if (!session) {
    return <Redirect href="/(auth)/login" />;
  }

  const showOrganizerTab = hasOrganizerSurfaceAccess(session.user);
  const showScannerTab = hasScannerSurfaceAccess(session.user);

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
        name="organizer"
        options={{
          href: showOrganizerTab ? undefined : null,
          tabBarLabel: "Organizer",
          title: "Organizer",
        }}
      />
      <Tabs.Screen
        name="scanner/index"
        options={{
          href: showScannerTab ? undefined : null,
          tabBarLabel: "Scanner",
          title: "Scanner",
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
