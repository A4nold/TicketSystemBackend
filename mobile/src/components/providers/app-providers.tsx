import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { type PropsWithChildren, useState } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { AuthProvider } from "@/components/providers/auth-provider";
import { PushNotificationsProvider } from "@/components/providers/push-notifications-provider";
import { RuntimeMonitoringProvider } from "@/components/providers/runtime-monitoring-provider";
import { WalletSyncProvider } from "@/components/providers/wallet-sync-provider";

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
      <QueryClientProvider client={queryClient}>
        <RuntimeMonitoringProvider>
          <AuthProvider>
            <PushNotificationsProvider>
              <WalletSyncProvider>{children}</WalletSyncProvider>
            </PushNotificationsProvider>
          </AuthProvider>
        </RuntimeMonitoringProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
