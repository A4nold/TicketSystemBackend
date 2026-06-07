import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StripeProvider, handleURLCallback } from "@stripe/stripe-react-native";
import { Fragment, type PropsWithChildren, useEffect, useState } from "react";
import { Linking } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { AuthProvider } from "@/components/providers/auth-provider";
import { getStripePublishableKey } from "@/lib/config/env";
import { PushNotificationsProvider } from "@/components/providers/push-notifications-provider";
import { RuntimeMonitoringProvider } from "@/components/providers/runtime-monitoring-provider";
import { WalletSyncProvider } from "@/components/providers/wallet-sync-provider";

function StripeCheckoutProvider({ children }: PropsWithChildren) {
  const publishableKey = getStripePublishableKey() ?? "";

  useEffect(() => {
    const subscription = Linking.addEventListener("url", ({ url }) => {
      void handleURLCallback(url).catch(() => false);
    });

    return () => subscription.remove();
  }, []);

  if (!publishableKey) {
    return <Fragment>{children}</Fragment>;
  }

  return (
    <StripeProvider publishableKey={publishableKey} urlScheme="ticketsystem">
      <Fragment>{children}</Fragment>
    </StripeProvider>
  );
}

export function AppProviders({ children }: PropsWithChildren) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: 1,
          },
        },
      }),
  );

  return (
    <SafeAreaProvider>
      <StripeCheckoutProvider>
        <QueryClientProvider client={queryClient}>
          <RuntimeMonitoringProvider>
            <AuthProvider>
              <PushNotificationsProvider>
                <WalletSyncProvider>{children}</WalletSyncProvider>
              </PushNotificationsProvider>
            </AuthProvider>
          </RuntimeMonitoringProvider>
        </QueryClientProvider>
      </StripeCheckoutProvider>
    </SafeAreaProvider>
  );
}
