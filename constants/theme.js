// constants/theme.js
import { StyleSheet } from "react-native";

// ─── Brand Colors ─────────────────────────────────────────────────────────────
export const C = {
  bg: "#FAF9F6",
  surface: "#FFFFFF",
  primary: "#7C9A6B",
  accent: "#D4847C",
  sand: "#E6DCC4",
  sandDeep: "#D9CEAD",
  text: "#2D2D2D",
  muted: "#8A8A8A",
  border: "#E8E4DC",
  overlay: "rgba(45, 45, 45, 0.3)",

  // Status
  success: "#6DD47E",
  warning: "#FFCE67",
  danger: "#E57373",
};

// ─── Vibe Tags ────────────────────────────────────────────────────────────────
export const VIBES = ["chill", "foodie", "adventure", "budget", "spontaneous"];

export const VIBE_COLORS = {
  chill: { bg: "#EEF4EB", text: "#5A7A4A" },
  foodie: { bg: "#FDF0EE", text: "#B5615A" },
  adventure: { bg: "#EEF4EB", text: "#5A7A4A" },
  budget: { bg: "#F5F2EC", text: "#7A6A4A" },
  spontaneous: { bg: "#FDF0EE", text: "#B5615A" },
};

// ─── Typography ───────────────────────────────────────────────────────────────
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
  sm: 6,
  md: 8,
  lg: 10, // Lepax default — kept intentionally tighter
  xl: 12,
  full: 999,
};

// ─── Shadows ──────────────────────────────────────────────────────────────────
export const Shadows = {
  small: {
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  medium: {
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
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
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: C.border,
    ...Shadows.small,
  },

  // Text
  textPrimary: {
    fontSize: Typography.base,
    fontWeight: Typography.semibold,
    color: C.text,
  },
  textSecondary: {
    fontSize: Typography.base,
    color: C.muted,
  },
  textMuted: {
    fontSize: Typography.sm,
    color: C.muted,
  },

  // Buttons
  btn: {
    backgroundColor: C.primary,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    alignItems: "center",
  },
  btnText: {
    color: C.surface,
    fontSize: Typography.lg,
    fontWeight: Typography.bold,
  },
  btnOutline: {
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    alignItems: "center",
  },
  btnOutlineText: {
    color: C.text,
    fontSize: Typography.lg,
    fontWeight: Typography.semibold,
  },

  // Input
  input: {
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    fontSize: Typography.md,
    color: C.text,
  },
  inputLabel: {
    fontSize: Typography.sm,
    fontWeight: Typography.semibold,
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
    borderBottomWidth: 1,
    borderColor: C.border,
  },
  navTitle: {
    fontSize: Typography.lg,
    fontWeight: Typography.bold,
    color: C.text,
  },

  // Divider
  divider: {
    height: 1,
    backgroundColor: C.border,
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
    borderRadius: 36,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  emptyStateText: {
    fontSize: Typography.lg,
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
