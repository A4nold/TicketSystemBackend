export const palette = {
  accent: "#c26a2d",
  accentDeep: "#8f4d1f",
  accentSoft: "#f4ddc8",
  backgroundMuted: "#efe4d2",
  background: "#f5efe2",
  black: "#120c09",
  card: "#fffaf0",
  danger: "#b83a33",
  divider: "#dccdbd",
  glass: "rgba(255, 250, 240, 0.72)",
  ink: "#201510",
  mutedSoft: "#8f7b6e",
  muted: "#6f5d53",
  shadow: "rgba(32, 21, 16, 0.12)",
  success: "#0b7a52",
  successDeep: "#085238",
  successSoft: "#dcefe5",
  warning: "#8f5b17",
  warningSoft: "#f6e8cb",
  white: "#ffffff",
};

export const spacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  pill: 999,
} as const;

export const typography = {
  body: {
    fontSize: 15,
    lineHeight: 22,
  },
  headingLg: {
    fontSize: 36,
    fontWeight: "800" as const,
  },
  headingMd: {
    fontSize: 22,
    fontWeight: "800" as const,
  },
  labelXs: {
    fontSize: 12,
    fontWeight: "800" as const,
    letterSpacing: 1.2,
    textTransform: "uppercase" as const,
  },
} as const;

export const elevation = {
  card: {
    shadowColor: palette.black,
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.08,
    shadowRadius: 28,
  },
} as const;
