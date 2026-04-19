import { useRouter } from "expo-router";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { useAuth } from "@/components/providers/auth-provider";
import { usePushNotifications } from "@/components/providers/push-notifications-provider";
import { SupportCard } from "@/components/support/support-card";
import { canManageOrganizerEvents, hasOrganizerSurfaceAccess } from "@/features/auth/organizer-access";
import { canAccessScannerEvents, hasScannerSurfaceAccess } from "@/features/auth/scanner-access";
import { ActionButton, Card, Screen } from "@/components/ui";
import { palette } from "@/styles/theme";

export function AccountScreen() {
  const router = useRouter();
  const { session, signOut } = useAuth();
  const hasOrganizerAccess = hasOrganizerSurfaceAccess(session?.user);
  const canManageEvents = canManageOrganizerEvents(session?.user);
  const hasScannerAccess = hasScannerSurfaceAccess(session?.user);
  const canScanEvents = canAccessScannerEvents(session?.user);
  const {
    canRequestPermissions,
    isEnabled,
    isRegistering,
    lastError: pushError,
    permissionStatus,
    registerForPushNotifications,
    unregisterFromPushNotifications,
  } = usePushNotifications();

  return (
    <Screen
      title="Account"
      subtitle="Your account details and session settings."
    >
      <ScrollView contentContainerStyle={styles.content}>
        <Card tone="accent" padded={false}>
          <View style={styles.heroShell}>
            <Text style={styles.heroEyebrow}>Account center</Text>
            <Text style={styles.heroTitle}>
              Manage your account.
            </Text>
            <Text style={styles.heroCopy}>
              Check your profile, access level, and session settings.
            </Text>

            <View style={styles.metricRow}>
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>Account type</Text>
                <Text style={styles.metricValueSmall}>{session?.user.accountType}</Text>
              </View>
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>Surface access</Text>
                <Text style={styles.metricValueSmall}>{session?.user.appRoles.length}</Text>
              </View>
            </View>
          </View>
        </Card>

        <Card padded={false}>
          <View style={styles.sectionShell}>
            <Text style={styles.sectionTitle}>Profile snapshot</Text>

            <View style={styles.infoTile}>
              <Text style={styles.label}>Signed in as</Text>
              <Text style={styles.primaryValue}>{session?.user.email}</Text>
            </View>

            <View style={styles.infoRow}>
              <View style={styles.infoTileCompact}>
                <Text style={styles.label}>Account type</Text>
                <Text style={styles.value}>{session?.user.accountType}</Text>
              </View>
              <View style={styles.infoTileCompact}>
                <Text style={styles.label}>Status</Text>
                <Text style={styles.value}>{session?.user.status}</Text>
              </View>
            </View>

            <View style={styles.infoTile}>
              <Text style={styles.label}>Surface access</Text>
              <Text style={styles.value}>{session?.user.appRoles.join(", ")}</Text>
            </View>
          </View>
        </Card>

        <Card tone="accent" padded={false}>
          <View style={styles.sectionShell}>
            <Text style={styles.sectionTitle}>Product access</Text>
            <Text style={styles.value}>
              {hasOrganizerAccess || hasScannerAccess
                ? "Expanded tools available"
                : "Attendee experience active"}
            </Text>
            <Text style={styles.copy}>
              {hasOrganizerAccess
                ? canManageEvents
                  ? "You can move between your wallet and organizer workflows on this device."
                  : "Organizer access is enabled for this account, but there are no accepted owner or admin event memberships available yet."
                : hasScannerAccess
                  ? canScanEvents
                    ? "This account is ready for scanner operations alongside the wallet experience."
                    : "Scanner access is enabled for this account, but there are no accepted event memberships available yet."
                  : "This app keeps your wallet front and center, with organizer and scanner access added only when the account supports it."}
            </Text>
            {hasOrganizerAccess ? (
              <ActionButton
                onPress={() => {
                  router.push("/organizer" as never);
                }}
                title="Open organizer"
              />
            ) : null}
            {hasScannerAccess ? (
              <ActionButton
                onPress={() => {
                  router.push("/scanner" as never);
                }}
                title="Open scanner"
                variant="secondary"
              />
            ) : null}
          </View>
        </Card>

        <Card padded={false}>
          <View style={styles.sectionShell}>
            <Text style={styles.sectionTitle}>Sign out</Text>
            <Text style={styles.copy}>
              End your current session on this device.
            </Text>
            <ActionButton
              onPress={() => {
                void unregisterFromPushNotifications().then(() =>
                  signOut().then(() => {
                    router.replace("/(auth)/login");
                  }),
                );
              }}
              title="Sign out"
              variant="secondary"
            />
          </View>
        </Card>

        <Card padded={false}>
          <View style={styles.sectionShell}>
            <Text style={styles.sectionTitle}>Push notifications</Text>
            <Text style={styles.value}>
              {permissionStatus === "unsupported"
                ? "Physical device required"
                : isEnabled
                  ? "Enabled on this device"
                  : permissionStatus === "granted"
                    ? "Permission granted, registration pending"
                    : "Not enabled yet"}
            </Text>
            <Text style={styles.copy}>
              Purchase confirmations, incoming transfers, transfer reminders, and event reminders
              can appear here even when the app is closed.
            </Text>
            {pushError ? <Text style={styles.error}>{pushError}</Text> : null}
            {permissionStatus !== "unsupported" ? (
              <ActionButton
                loading={isRegistering}
                onPress={() => {
                  void registerForPushNotifications();
                }}
                title={
                  isEnabled
                    ? "Refresh notification registration"
                    : canRequestPermissions
                      ? "Enable push notifications"
                      : "Finish notification setup"
                }
              />
            ) : null}
          </View>
        </Card>

        <SupportCard
          body="Use this path if recovery, wallet delivery, or scanner access still fails after retrying in-app. Include your account email and the event or ticket reference involved."
          subject="TicketSystem account support"
          title="Need help with this account or event access?"
        />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 18,
    padding: 20,
    paddingBottom: 48,
  },
  copy: {
    color: palette.muted,
    fontSize: 15,
    lineHeight: 22,
  },
  error: {
    color: palette.danger,
    fontSize: 14,
    lineHeight: 20,
  },
  heroCopy: {
    color: palette.white,
    fontSize: 15,
    lineHeight: 22,
    maxWidth: 310,
    opacity: 0.9,
  },
  heroEyebrow: {
    color: "#ffe0bf",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  heroShell: {
    backgroundColor: palette.black,
    gap: 14,
    padding: 22,
  },
  heroTitle: {
    color: palette.white,
    fontSize: 29,
    fontWeight: "800",
    lineHeight: 34,
    maxWidth: 320,
  },
  infoRow: {
    flexDirection: "row",
    gap: 12,
  },
  infoTile: {
    backgroundColor: palette.card,
    borderColor: palette.divider,
    borderRadius: 20,
    borderWidth: 1,
    gap: 8,
    padding: 16,
  },
  infoTileCompact: {
    backgroundColor: palette.card,
    borderColor: palette.divider,
    borderRadius: 20,
    borderWidth: 1,
    flex: 1,
    gap: 8,
    padding: 16,
  },
  label: {
    color: palette.mutedSoft,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.1,
    textTransform: "uppercase",
  },
  metricCard: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderColor: "rgba(255,255,255,0.12)",
    borderRadius: 18,
    borderWidth: 1,
    flex: 1,
    gap: 6,
    minHeight: 84,
    padding: 14,
  },
  metricLabel: {
    color: "#dbc7b6",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.1,
    textTransform: "uppercase",
  },
  metricRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  metricValueSmall: {
    color: palette.white,
    fontSize: 18,
    fontWeight: "700",
  },
  primaryValue: {
    color: palette.ink,
    fontSize: 20,
    fontWeight: "700",
  },
  sectionShell: {
    gap: 14,
    padding: 18,
  },
  sectionTitle: {
    color: palette.ink,
    fontSize: 22,
    fontWeight: "800",
  },
  value: {
    color: palette.ink,
    fontSize: 18,
    fontWeight: "700",
  },
});
