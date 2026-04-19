import * as SecureStore from "expo-secure-store";

import type { ScannerAttemptRecord } from "@/features/scanner/scanner-model";

const scannerStateKeyPrefix = "ticketsystem-mobile-scanner-state";

export type PersistedScannerEventState = {
  recentAttempts: ScannerAttemptRecord[];
  scanSessionId: string | null;
};

export type PersistedScannerState = {
  eventStates: Record<string, PersistedScannerEventState>;
  laneLabel: string;
  selectedEventId: string | null;
  version: 1;
};

function getScannerStateKey(userId: string) {
  return `${scannerStateKeyPrefix}:${userId}`;
}

export function createEmptyScannerState(): PersistedScannerState {
  return {
    eventStates: {},
    laneLabel: "Front Gate",
    selectedEventId: null,
    version: 1,
  };
}

export async function loadPersistedScannerState(userId: string) {
  const raw = await SecureStore.getItemAsync(getScannerStateKey(userId));

  if (!raw) {
    return createEmptyScannerState();
  }

  try {
    const parsed = JSON.parse(raw) as Partial<PersistedScannerState>;

    return {
      eventStates: parsed.eventStates ?? {},
      laneLabel: parsed.laneLabel?.trim() || "Front Gate",
      selectedEventId: parsed.selectedEventId ?? null,
      version: 1,
    };
  } catch {
    return createEmptyScannerState();
  }
}

export async function persistScannerState(
  userId: string,
  state: PersistedScannerState,
) {
  await SecureStore.setItemAsync(getScannerStateKey(userId), JSON.stringify(state));
}

export async function clearPersistedScannerState(userId: string) {
  await SecureStore.deleteItemAsync(getScannerStateKey(userId));
}
