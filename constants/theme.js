// constants/theme.js
import { StyleSheet } from "react-native";

// ─── Brand Colors ─────────────────────────────────────────────────────────────
export const C = {
  bg: "#F7F1E6",
  surface: "#FFFFFF",
  surfaceWarm: "#FFF8EA",
  ink: "#252323",
  primary: "#17766A",
  primaryDark: "#0F4D46",
  accent: "#E4572E",
  sun: "#F4B942",
  aqua: "#46B6B0",
  sand: "#E9DAB9",
  sandDeep: "#D7BE83",
  text: "#252323",
  muted: "#7B746A",
  border: "#E0D3B8",
  overlay: "rgba(37, 35, 35, 0.36)",

  // Status
  success: "#6DD47E",
  warning: "#FFCE67",
  danger: "#E57373",
};

export const VIBES = [
  "chill",
  "foodie",
  "adventure",
  "budget",
  "spontaneous",
  "sports",
  "luxury",
  "culture",
  "nature",
  "nightlife",
  "wellness",
  "roadtrip"
];

export const VIBE_COLORS = {
  chill: { bg: "#DDF1E7", text: "#17766A", border: "#B7DDCE" },
  foodie: { bg: "#FFE2D5", text: "#B84224", border: "#F3B39C" },
  adventure: { bg: "#E5EBC8", text: "#5B6F1D", border: "#C9D685" },
  budget: { bg: "#FFF1BE", text: "#856118", border: "#E8CB6F" },
  spontaneous: { bg: "#DCEAFB", text: "#2B5F8C", border: "#AFCBEA" },
  sports: { bg: "#FFDDE2", text: "#A32D4B", border: "#F5B4BE" },
  luxury: { bg: "#E2D3FD", text: "#522D85", border: "#BEACF5" },
  culture: { bg: "#FDEDD0", text: "#9B5D14", border: "#EBC28F" },
  nature: { bg: "#E2F0D8", text: "#3E6B27", border: "#BEDBB3" },
  nightlife: { bg: "#FFDEF7", text: "#B32885", border: "#F7ADDD" },
  wellness: { bg: "#D2FAF8", text: "#227D79", border: "#A1EBE7" },
  roadtrip: { bg: "#FFF2D2", text: "#8A6922", border: "#EED195" },
};

// ─── Typography ───────────────────────────────────────────────────────────────
export const Families = {
  display: "Syne-Bold",
  regular: "PlusJakartaSans-Regular",
  medium: "PlusJakartaSans-Medium",
  semibold: "PlusJakartaSans-SemiBold",
  bold: "PlusJakartaSans-Bold",
};

export const Typography = {
  xs: 10,
  sm: 12,
  base: 13,
  md: 14,
  lg: 15,
  xl: 16,
  xxl: 18,
  xxxl: 20,
  huge: 24,

  regular: "400",
  medium: "500",
  semibold: "600",
  bold: "700",
  extrabold: "800",
};

// ─── Spacing ──────────────────────────────────────────────────────────────────
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

// ─── Border Radius ────────────────────────────────────────────────────────────
export const BorderRadius = {
  sm: 4,
  md: 8,
  lg: 10,
  xl: 14,
  full: 999,
};

// ─── Neo-Brutalist Layout System ──────────────────────────────────────────────
export const Brutalist = {
  borderWidth: 2.2,
  borderColor: C.ink,
  cardShadow: {
    shadowColor: C.ink,
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },
  btnShadow: {
    shadowColor: C.ink,
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 3,
  },
  tiltedLabel: {
    transform: [{ rotate: "-1deg" }],
  },
};

// ─── Shadows (Standard Fallback) ──────────────────────────────────────────────
export const Shadows = {
  small: {
    borderWidth: Brutalist.borderWidth,
    borderColor: Brutalist.borderColor,
    ...Brutalist.cardShadow,
  },
  medium: {
    borderWidth: Brutalist.borderWidth,
    borderColor: Brutalist.borderColor,
    ...Brutalist.cardShadow,
  },
  brand: {
    borderWidth: Brutalist.borderWidth,
    borderColor: Brutalist.borderColor,
    ...Brutalist.cardShadow,
  },
};

// ─── Global Styles ────────────────────────────────────────────────────────────
export const GlobalStyles = StyleSheet.create({
  // Containers
  container: {
    flex: 1,
    backgroundColor: C.bg,
  },

  // Cards
  card: {
    backgroundColor: C.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    borderWidth: Brutalist.borderWidth,
    borderColor: Brutalist.borderColor,
    ...Brutalist.cardShadow,
  },

  // Text
  textPrimary: {
    fontFamily: Families.semibold,
    fontSize: Typography.base,
    color: C.text,
  },
  textSecondary: {
    fontFamily: Families.regular,
    fontSize: Typography.base,
    color: C.muted,
  },
  textMuted: {
    fontFamily: Families.regular,
    fontSize: Typography.sm,
    color: C.muted,
  },

  // Buttons
  btn: {
    backgroundColor: C.primary,
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: Brutalist.borderWidth,
    borderColor: Brutalist.borderColor,
    ...Brutalist.btnShadow,
    alignItems: "center",
    justifyContent: "center",
  },
  btnText: {
    color: C.surface,
    fontSize: Typography.lg,
    fontFamily: Families.bold,
  },
  btnOutline: {
    backgroundColor: C.surfaceWarm,
    borderWidth: Brutalist.borderWidth,
    borderColor: Brutalist.borderColor,
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    ...Brutalist.btnShadow,
    alignItems: "center",
    justifyContent: "center",
  },
  btnOutlineText: {
    color: C.text,
    fontSize: Typography.lg,
    fontFamily: Families.bold,
  },

  // Input
  input: {
    backgroundColor: C.surface,
    borderWidth: Brutalist.borderWidth,
    borderColor: Brutalist.borderColor,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: Typography.md,
    fontFamily: Families.medium,
    color: C.text,
  },
  inputLabel: {
    fontSize: Typography.sm,
    fontFamily: Families.bold,
    color: C.text,
    marginBottom: Spacing.xs,
  },

  // Nav bar
  navBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.md,
    backgroundColor: C.bg,
    borderBottomWidth: Brutalist.borderWidth,
    borderColor: Brutalist.borderColor,
  },
  navTitle: {
    fontSize: Typography.lg,
    fontFamily: Families.display,
    color: C.text,
  },

  // Divider
  divider: {
    height: Brutalist.borderWidth,
    backgroundColor: Brutalist.borderColor,
    marginVertical: Spacing.md,
  },

  // Empty state
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.xxxl * 2,
    paddingHorizontal: Spacing.xxxl,
  },
  emptyStateIcon: {
    backgroundColor: C.sand,
    width: 72,
    height: 72,
    borderRadius: BorderRadius.md,
    borderWidth: Brutalist.borderWidth,
    borderColor: Brutalist.borderColor,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  emptyStateText: {
    fontSize: Typography.lg,
    fontFamily: Families.medium,
    color: C.muted,
    textAlign: "center",
    lineHeight: 22,
  },

  // Loading
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: C.bg,
  },

  // Layout helpers
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  rowCenter: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },

  // Spacing utilities
  mt_sm: { marginTop: Spacing.sm },
  mt_md: { marginTop: Spacing.md },
  mt_lg: { marginTop: Spacing.lg },
  mt_xl: { marginTop: Spacing.xl },
  mb_sm: { marginBottom: Spacing.sm },
  mb_md: { marginBottom: Spacing.md },
  mb_lg: { marginBottom: Spacing.lg },
  mb_xl: { marginBottom: Spacing.xl },
});

export default GlobalStyles;
