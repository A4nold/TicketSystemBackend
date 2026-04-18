import * as SecureStore from "expo-secure-store";

import type { AuthSession } from "@/lib/auth/types";

const sessionKey = "ticketsystem-mobile-session";

export async function loadStoredSession() {
  const raw = await SecureStore.getItemAsync(sessionKey);

  if (!raw) {
    return null;
  }

  return JSON.parse(raw) as AuthSession;
}

export async function persistSession(session: AuthSession) {
  await SecureStore.setItemAsync(sessionKey, JSON.stringify(session));
}

export async function clearStoredSession() {
  await SecureStore.deleteItemAsync(sessionKey);
}
