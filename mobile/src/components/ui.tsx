import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { palette } from "@/styles/theme";

export function Screen({
  children,
  title,
  subtitle,
}: {
  children: React.ReactNode;
  subtitle?: string;
  title: string;
}) {
  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.chrome}>
        <View style={styles.orbPrimary} />
        <View style={styles.orbSecondary} />
        <View style={styles.header}>
          <Text style={styles.kicker}>TicketSystem Mobile</Text>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
      </View>
      <View style={styles.body}>{children}</View>
    </SafeAreaView>
  );
}

export function Card({
  children,
  tone = "default",
  padded = true,
}: {
  children: React.ReactNode;
  padded?: boolean;
  tone?: "accent" | "default" | "success" | "warning";
}) {
  return (
    <View style={[styles.card, toneStyles[tone], !padded ? styles.cardUnpadded : null]}>
      {children}
    </View>
  );
}

export function ActionButton({
  title,
  onPress,
  variant = "primary",
  disabled = false,
  loading = false,
}: {
  disabled?: boolean;
  loading?: boolean;
  onPress: () => void;
  title: string;
  variant?: "primary" | "secondary";
}) {
  return (
    <Pressable
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        variant === "secondary" ? styles.secondaryButton : styles.primaryButton,
        (disabled || loading) && styles.buttonDisabled,
        pressed && !(disabled || loading) ? styles.buttonPressed : null,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === "secondary" ? palette.ink : "#ffffff"} />
      ) : (
        <Text
          style={[
            styles.buttonText,
            variant === "secondary" ? styles.secondaryButtonText : null,
          ]}
        >
          {title}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  body: {
    flex: 1,
    gap: 16,
  },
  button: {
    alignItems: "center",
    borderRadius: 999,
    justifyContent: "center",
    minHeight: 52,
    paddingHorizontal: 18,
  },
  buttonDisabled: {
    opacity: 0.55,
  },
  buttonPressed: {
    transform: [{ scale: 0.99 }],
  },
  buttonText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "700",
  },
  card: {
    borderRadius: 24,
    borderWidth: 1,
    gap: 12,
    overflow: "hidden",
    padding: 18,
    shadowColor: palette.black,
    shadowOffset: {
      height: 14,
      width: 0,
    },
    shadowOpacity: 0.08,
    shadowRadius: 28,
  },
  cardUnpadded: {
    padding: 0,
  },
  chrome: {
    overflow: "hidden",
    paddingBottom: 10,
    position: "relative",
  },
  header: {
    gap: 8,
    paddingHorizontal: 20,
    paddingTop: 12,
    zIndex: 1,
  },
  kicker: {
    color: palette.accentDeep,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.4,
    textTransform: "uppercase",
  },
  orbPrimary: {
    backgroundColor: "#f0cfab",
    borderRadius: 999,
    height: 220,
    opacity: 0.45,
    position: "absolute",
    right: -30,
    top: -80,
    width: 220,
  },
  orbSecondary: {
    backgroundColor: "#dbefe0",
    borderRadius: 999,
    height: 160,
    left: -40,
    opacity: 0.55,
    position: "absolute",
    top: 10,
    width: 160,
  },
  primaryButton: {
    backgroundColor: palette.ink,
  },
  safeArea: {
    backgroundColor: palette.background,
    flex: 1,
  },
  secondaryButton: {
    backgroundColor: "#ffffff",
    borderColor: "#d6c7b8",
    borderWidth: 1,
  },
  secondaryButtonText: {
    color: palette.ink,
  },
  subtitle: {
    color: palette.muted,
    fontSize: 15,
    lineHeight: 22,
    maxWidth: 360,
  },
  title: {
    color: palette.ink,
    fontSize: 36,
    fontWeight: "800",
  },
});

const toneStyles = StyleSheet.create({
  accent: {
    backgroundColor: palette.accentSoft,
    borderColor: "#e7b98f",
  },
  default: {
    backgroundColor: palette.card,
    borderColor: "#e7dbcc",
  },
  success: {
    backgroundColor: palette.successSoft,
    borderColor: "#b8d9ca",
  },
  warning: {
    backgroundColor: palette.warningSoft,
    borderColor: "#ead39a",
  },
});
