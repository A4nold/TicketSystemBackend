import { StyleSheet } from "react-native";

import { palette, radius, spacing, typography } from "@/styles/theme";

export const commonStyles = StyleSheet.create({
  bodyCopy: {
    color: palette.muted,
    ...typography.body,
  },
  contentContainer: {
    gap: spacing.md,
    padding: spacing.lg,
    paddingBottom: 48,
  },
  headingLg: {
    color: palette.ink,
    ...typography.headingMd,
  },
  headingMd: {
    color: palette.ink,
    fontSize: 20,
    fontWeight: "800",
  },
  heroDarkEyebrow: {
    color: "#ffe0bf",
    ...typography.labelXs,
    letterSpacing: 1.5,
  },
  heroDarkMetricCard: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderColor: "rgba(255,255,255,0.12)",
    borderRadius: radius.md,
    borderWidth: 1,
    flex: 1,
    gap: spacing.xs,
    minHeight: 84,
    padding: spacing.sm,
  },
  heroDarkMetricLabel: {
    color: "#dbc7b6",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.1,
    textTransform: "uppercase",
  },
  heroDarkMetricRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  heroDarkShell: {
    backgroundColor: palette.black,
    gap: spacing.sm,
    padding: spacing.lg,
  },
  neutralPill: {
    backgroundColor: palette.backgroundMuted,
    borderColor: palette.divider,
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  neutralPillText: {
    color: palette.ink,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  pillBase: {
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  rowBetweenCenterGap12: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "space-between",
  },
  sectionHeaderMeta: {
    alignItems: "flex-end",
    gap: spacing.xs,
  },
  sectionShell: {
    gap: spacing.sm,
    padding: spacing.md,
  },
  sectionStatusPill: {
    backgroundColor: palette.backgroundMuted,
    borderColor: palette.divider,
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  sectionHeaderRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "space-between",
  },
  sectionStatusPillText: {
    color: palette.muted,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  softCard: {
    backgroundColor: palette.card,
    borderColor: palette.divider,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing.xs,
    padding: spacing.md,
  },
  subtleEmptyCard: {
    backgroundColor: palette.backgroundMuted,
    borderColor: palette.divider,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing.xs,
    padding: spacing.md,
  },
});
