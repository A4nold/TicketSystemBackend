import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { elevation, palette, radius, spacing, typography } from "@/styles/theme";

export function Screen({
  children,
  compactHeader = false,
  title,
  subtitle,
}: {
  children: React.ReactNode;
  compactHeader?: boolean;
  subtitle?: string;
  title: string;
}) {
  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.chrome}>
        {!compactHeader ? <View style={styles.orbPrimary} /> : null}
        {!compactHeader ? <View style={styles.orbSecondary} /> : null}
        <View style={[styles.header, compactHeader ? styles.headerCompact : null]}>
          {!compactHeader ? <Text style={styles.kicker}>Maya</Text> : null}
          <Text
            style={[styles.title, compactHeader ? styles.titleCompact : null]}
            numberOfLines={2}
          >
            {title}
          </Text>
          {subtitle ? (
            <Text style={styles.subtitle} numberOfLines={2}>
              {subtitle}
            </Text>
          ) : null}
        </View>
      </View>
      <View style={styles.body}>{children}</View>
    </SafeAreaView>
  );
}

export function Card({
  children,
  density = "comfortable",
  tone = "default",
  padded = true,
}: {
  children: React.ReactNode;
  density?: "comfortable" | "dense";
  padded?: boolean;
  tone?: "accent" | "default" | "success" | "warning";
}) {
  return (
    <View
      style={[
        styles.card,
        density === "dense" ? styles.cardDense : null,
        toneStyles[tone],
        !padded ? styles.cardUnpadded : null,
      ]}
    >
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

export function LoadingStateCard({
  title = "Loading",
  subtitle,
}: {
  subtitle?: string;
  title?: string;
}) {
  return (
    <Card>
      <Text style={styles.stateTitle}>{title}</Text>
      {subtitle ? <Text style={styles.stateSubtitle}>{subtitle}</Text> : null}
    </Card>
  );
}

export function EmptyStateCard({
  title,
  subtitle,
  action,
  actionTitle,
  secondaryAction,
  secondaryActionTitle,
}: {
  action?: () => void;
  actionTitle?: string;
  secondaryAction?: () => void;
  secondaryActionTitle?: string;
  subtitle?: string;
  title: string;
}) {
  return (
    <Card>
      <Text style={styles.stateTitle}>{title}</Text>
      {subtitle ? <Text style={styles.stateSubtitle}>{subtitle}</Text> : null}
      {action && actionTitle ? <ActionButton onPress={action} title={actionTitle} /> : null}
      {secondaryAction && secondaryActionTitle ? (
        <ActionButton onPress={secondaryAction} title={secondaryActionTitle} variant="secondary" />
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  body: {
    flex: 1,
    gap: spacing.md,
  },
  button: {
    alignItems: "center",
    borderRadius: radius.pill,
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: spacing.md,
  },
  buttonDisabled: {
    opacity: 0.55,
  },
  buttonPressed: {
    transform: [{ scale: 0.99 }],
  },
  buttonText: {
    color: "#ffffff",
    fontSize: typography.body.fontSize,
    fontWeight: "700",
  },
  card: {
    alignSelf: "stretch",
    borderRadius: radius.xl,
    borderWidth: 1,
    gap: spacing.sm,
    overflow: "hidden",
    padding: spacing.md,
    ...elevation.card,
  },
  cardUnpadded: {
    padding: 0,
  },
  cardDense: {
    gap: spacing.xs,
    padding: spacing.sm,
  },
  chrome: {
    overflow: "hidden",
    paddingBottom: spacing.xs,
    position: "relative",
  },
  header: {
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    zIndex: 1,
  },
  headerCompact: {
    gap: spacing.xxs,
    paddingBottom: spacing.xs,
    paddingTop: spacing.xs,
  },
  kicker: {
    color: palette.accentDeep,
    ...typography.labelXs,
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
    ...typography.body,
    maxWidth: 360,
  },
  stateSubtitle: {
    color: palette.muted,
    ...typography.body,
  },
  stateTitle: {
    color: palette.ink,
    ...typography.headingSm,
  },
  title: {
    color: palette.ink,
    ...typography.headingLg,
  },
  titleCompact: {
    fontSize: 28,
    lineHeight: 32,
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
