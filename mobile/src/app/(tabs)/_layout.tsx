import { Ionicons } from "@expo/vector-icons";
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
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? "wallet" : "wallet-outline"}
              size={size}
              color={color}
            />
          ),
          tabBarLabel: "Wallet",
          title: "Wallet",
        }}
      />
      <Tabs.Screen
        name="activity"
        options={{
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? "pulse" : "pulse-outline"}
              size={size}
              color={color}
            />
          ),
          tabBarLabel: "Activity",
          title: "Activity",
        }}
      />
      <Tabs.Screen
        name="organizer"
        options={{
          href: showOrganizerTab ? undefined : null,
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? "briefcase" : "briefcase-outline"}
              size={size}
              color={color}
            />
          ),
          tabBarLabel: "Organizer",
          title: "Organizer",
        }}
      />
      <Tabs.Screen
        name="scanner/index"
        options={{
          href: showScannerTab ? undefined : null,
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? "qr-code" : "qr-code-outline"}
              size={size}
              color={color}
            />
          ),
          tabBarLabel: "Scanner",
          title: "Scanner",
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? "person-circle" : "person-circle-outline"}
              size={size}
              color={color}
            />
          ),
          tabBarLabel: "Account",
          title: "Account",
        }}
      />
    </Tabs>
  );
}
