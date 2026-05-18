import * as SecureStore from "expo-secure-store";

const onboardingSeenKey = "ticketsystem-mobile-onboarding-seen";

export async function hasSeenOnboarding() {
  const value = await SecureStore.getItemAsync(onboardingSeenKey);
  return value === "1";
}

export async function markOnboardingSeen() {
  await SecureStore.setItemAsync(onboardingSeenKey, "1");
}
