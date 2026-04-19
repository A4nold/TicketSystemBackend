import { apiFetch } from "@/lib/api/client";

export async function registerPushDevice(
  payload: {
    expoPushToken: string;
    platform: "IOS" | "ANDROID";
    deviceName?: string;
    appVersion?: string;
  },
  accessToken: string,
) {
  return apiFetch("/api/me/notifications/push-devices", {
    body: JSON.stringify(payload),
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    method: "POST",
  });
}

export async function unregisterPushDevice(
  payload: {
    expoPushToken: string;
  },
  accessToken: string,
) {
  return apiFetch("/api/me/notifications/push-devices/unregister", {
    body: JSON.stringify(payload),
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    method: "POST",
  });
}
