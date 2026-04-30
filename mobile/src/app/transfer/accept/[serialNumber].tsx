import { Redirect, useLocalSearchParams } from "expo-router";

import { useAuth } from "@/components/providers/auth-provider";
import { TransferAcceptanceScreen } from "@/features/transfers/transfer-acceptance-screen";

export default function TransferAcceptRoute() {
  const { session } = useAuth();
  const params = useLocalSearchParams<{ serialNumber?: string }>();
  const serialNumber = typeof params.serialNumber === "string" ? params.serialNumber.trim() : "";

  if (!session) {
    return <Redirect href="/(auth)/login" />;
  }

  if (!serialNumber) {
    return <Redirect href="/wallet" />;
  }

  return <TransferAcceptanceScreen serialNumber={serialNumber} />;
}
