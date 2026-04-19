import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import {
  createContext,
  type PropsWithChildren,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Platform } from "react-native";

import { useAuth } from "@/components/providers/auth-provider";
import { registerPushDevice, unregisterPushDevice } from "@/lib/notifications/push-client";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

type PushNotificationsContextValue = {
  canRequestPermissions: boolean;
  expoPushToken: string | null;
  isEnabled: boolean;
  isRegistering: boolean;
  lastError: string | null;
  permissionStatus: Notifications.PermissionStatus | "unsupported" | "unknown";
  registerForPushNotifications: () => Promise<boolean>;
  unregisterFromPushNotifications: () => Promise<void>;
};

const PushNotificationsContext = createContext<PushNotificationsContextValue | null>(null);

function getProjectId() {
  const envProjectId = process.env.EXPO_PUBLIC_EXPO_PROJECT_ID?.trim();

  if (envProjectId) {
    return envProjectId;
  }

  const easProjectId = Constants.easConfig?.projectId;

  if (easProjectId) {
    return easProjectId;
  }

  const expoProjectId =
    (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)?.eas?.projectId;

  return expoProjectId?.trim() || null;
}

export function PushNotificationsProvider({ children }: PropsWithChildren) {
  const { session } = useAuth();
  const [permissionStatus, setPermissionStatus] = useState<
    Notifications.PermissionStatus | "unsupported" | "unknown"
  >("unknown");
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const registeredTokenRef = useRef<string | null>(null);
  const previousSessionRef = useRef<{ accessToken: string } | null>(null);

  useEffect(() => {
    async function syncExistingPermissionState() {
      if (!Device.isDevice) {
        setPermissionStatus("unsupported");
        return;
      }

      const permissions = await Notifications.getPermissionsAsync();
      setPermissionStatus(permissions.status);
    }

    void syncExistingPermissionState();
  }, []);

  useEffect(() => {
    if (!session?.accessToken || permissionStatus !== "granted") {
      return;
    }

    if (registeredTokenRef.current) {
      return;
    }

    void registerCurrentDevice(session.accessToken);
  }, [permissionStatus, session?.accessToken]);

  useEffect(() => {
    previousSessionRef.current = session ? { accessToken: session.accessToken } : null;
  }, [session]);

  async function registerCurrentDevice(accessToken: string) {
    if (!Device.isDevice) {
      setPermissionStatus("unsupported");
      setLastError("Push notifications need a physical device.");
      return false;
    }

    const projectId = getProjectId();

    setIsRegistering(true);
    setLastError(null);

    try {
      if (Platform.OS === "android") {
        await Notifications.setNotificationChannelAsync("default", {
          importance: Notifications.AndroidImportance.HIGH,
          lightColor: "#f0cfab",
          name: "default",
          vibrationPattern: [0, 250, 250, 250],
        });
      }

      const pushTokenResponse = projectId
        ? await Notifications.getExpoPushTokenAsync({
            projectId,
          })
        : await Notifications.getExpoPushTokenAsync();

      const token = pushTokenResponse.data;

      await registerPushDevice(
        {
          appVersion: Constants.expoConfig?.version,
          deviceName: Device.deviceName ?? undefined,
          expoPushToken: token,
          platform: Platform.OS === "ios" ? "IOS" : "ANDROID",
        },
        accessToken,
      );

      registeredTokenRef.current = token;
      setExpoPushToken(token);
      return true;
    } catch (error) {
      setLastError(
        error instanceof Error
          ? error.message
          : "Push notifications could not be enabled right now.",
      );
      return false;
    } finally {
      setIsRegistering(false);
    }
  }

  async function registerForPushNotifications() {
    if (!Device.isDevice) {
      setPermissionStatus("unsupported");
      setLastError("Push notifications need a physical device.");
      return false;
    }

    const existing = await Notifications.getPermissionsAsync();
    let resolvedStatus = existing.status;

    if (resolvedStatus !== "granted") {
      const requested = await Notifications.requestPermissionsAsync();
      resolvedStatus = requested.status;
    }

    setPermissionStatus(resolvedStatus);

    if (resolvedStatus !== "granted") {
      setLastError("Notification permission is still disabled for this device.");
      return false;
    }

    if (!session?.accessToken) {
      setLastError("Sign in before enabling push notifications.");
      return false;
    }

    return registerCurrentDevice(session.accessToken);
  }

  async function unregisterFromPushNotifications() {
    const token = registeredTokenRef.current;
    const accessToken = session?.accessToken ?? previousSessionRef.current?.accessToken;

    if (!token || !accessToken) {
      registeredTokenRef.current = null;
      setExpoPushToken(null);
      return;
    }

    try {
      await unregisterPushDevice(
        {
          expoPushToken: token,
        },
        accessToken,
      );
    } catch {
      // Keep sign-out resilient even if device unregistration fails.
    } finally {
      registeredTokenRef.current = null;
      setExpoPushToken(null);
    }
  }

  const value = useMemo<PushNotificationsContextValue>(
    () => ({
      canRequestPermissions:
        permissionStatus === "denied" || permissionStatus === "undetermined" || permissionStatus === "unknown",
      expoPushToken,
      isEnabled: permissionStatus === "granted" && Boolean(expoPushToken),
      isRegistering,
      lastError,
      permissionStatus,
      registerForPushNotifications,
      unregisterFromPushNotifications,
    }),
    [expoPushToken, isRegistering, lastError, permissionStatus],
  );

  return (
    <PushNotificationsContext.Provider value={value}>
      {children}
    </PushNotificationsContext.Provider>
  );
}

export function usePushNotifications() {
  const value = useContext(PushNotificationsContext);

  if (!value) {
    throw new Error("usePushNotifications must be used within PushNotificationsProvider.");
  }

  return value;
}
