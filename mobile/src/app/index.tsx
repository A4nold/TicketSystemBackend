import { Redirect } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";

import { useAuth } from "@/components/providers/auth-provider";
import { DiscoveryScreen } from "@/features/public/discovery-screen";
import { hasSeenOnboarding } from "@/lib/onboarding/onboarding-storage";
import { palette } from "@/styles/theme";

export default function IndexScreen() {
  const { session } = useAuth();
  const [onboardingResolved, setOnboardingResolved] = useState(false);
  const [seenOnboarding, setSeenOnboarding] = useState(false);

  useEffect(() => {
    async function resolveOnboardingState() {
      try {
        setSeenOnboarding(await hasSeenOnboarding());
      } finally {
        setOnboardingResolved(true);
      }
    }

    void resolveOnboardingState();
  }, []);

  if (session) {
    return <Redirect href="/(tabs)/wallet" />;
  }

  if (!onboardingResolved) {
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

  if (!seenOnboarding) {
    return <Redirect href={"/onboarding" as never} />;
  }

  return <DiscoveryScreen />;
}
