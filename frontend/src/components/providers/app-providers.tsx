"use client";

import {
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import { useState } from "react";

import { AuthProvider } from "@/components/providers/auth-provider";
import { RuntimeMonitoringProvider } from "@/components/providers/runtime-monitoring-provider";

type AppProvidersProps = Readonly<{
  children: React.ReactNode;
}>;

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        refetchOnWindowFocus: false,
        retry: 1,
      },
      mutations: {
        retry: 0,
      },
    },
  });
}

export function AppProviders({ children }: AppProvidersProps) {
  const [queryClient] = useState(makeQueryClient);

  return (
    <QueryClientProvider client={queryClient}>
      <RuntimeMonitoringProvider>
        <AuthProvider>{children}</AuthProvider>
      </RuntimeMonitoringProvider>
    </QueryClientProvider>
  );
}
