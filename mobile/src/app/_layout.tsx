import { Stack } from "expo-router";
import { ActivityIndicator, View } from "react-native";

import { AppProviders } from "@/components/providers/app-providers";
import { useAuth } from "@/components/providers/auth-provider";
import { palette } from "@/styles/theme";

function RootNavigator() {
  const { bootstrapped } = useAuth();

  if (!bootstrapped) {
    return (
      <View
        style={{
          alignItems: "center",
          backgroundColor: palette.background,
          flex: 1,
          justifyContent: "center",
        }}
      >
        <ActivityIndicator color={palette.ink} />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen
        name="tickets/[serialNumber]"
        options={{
          presentation: "modal",
        }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <AppProviders>
      <RootNavigator />
    </AppProviders>
  );
}
