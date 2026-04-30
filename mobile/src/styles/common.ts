import { StyleSheet } from "react-native";

import { palette } from "@/styles/theme";

export const commonStyles = StyleSheet.create({
  bodyCopy: {
    color: palette.muted,
    fontSize: 15,
    lineHeight: 22,
  },
  contentContainer: {
    gap: 18,
    padding: 20,
    paddingBottom: 48,
  },
  headingLg: {
    color: palette.ink,
    fontSize: 22,
    fontWeight: "800",
  },
  headingMd: {
    color: palette.ink,
    fontSize: 20,
    fontWeight: "800",
  },
  heroDarkEyebrow: {
    color: "#ffe0bf",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  heroDarkMetricCard: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderColor: "rgba(255,255,255,0.12)",
    borderRadius: 18,
    borderWidth: 1,
    flex: 1,
    gap: 6,
    minHeight: 84,
    padding: 14,
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
    gap: 12,
    marginTop: 8,
  },
  heroDarkShell: {
    backgroundColor: palette.black,
    gap: 14,
    padding: 22,
  },
  neutralPill: {
    backgroundColor: palette.backgroundMuted,
    borderColor: palette.divider,
    borderRadius: 999,
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
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  rowBetweenCenterGap12: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
  },
  sectionHeaderMeta: {
    alignItems: "flex-end",
    gap: 8,
  },
  sectionShell: {
    gap: 14,
    padding: 18,
  },
  sectionStatusPill: {
    backgroundColor: palette.backgroundMuted,
    borderColor: palette.divider,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  sectionHeaderRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 12,
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
    borderRadius: 22,
    borderWidth: 1,
    gap: 10,
    padding: 16,
  },
  subtleEmptyCard: {
    backgroundColor: palette.backgroundMuted,
    borderColor: palette.divider,
    borderRadius: 20,
    borderWidth: 1,
    gap: 8,
    padding: 16,
  },
});
