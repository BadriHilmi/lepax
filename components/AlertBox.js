// components/AlertBox.js
import { useEffect, useRef } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
} from "react-native";
import { C, Typography, Spacing, BorderRadius } from "../constants/theme";
import { Ionicons as Icon } from "@expo/vector-icons";

const { width } = Dimensions.get("window");

// ─── Config ───────────────────────────────────────────────────────────────────
const TYPE_CONFIG = {
  success: { icon: "✓", color: C.success, bg: "#F0FAF1" },
  error: { icon: "✕", color: C.danger, bg: "#FDF2F2" },
  warning: { icon: "!", color: C.warning, bg: "#FFFBF0" },
  info: { icon: "i", color: C.primary, bg: "#F2F6F0" },
  confirm: { icon: "?", color: C.accent, bg: "#FDF5F4", size: 24 },
};

// ─── Component ────────────────────────────────────────────────────────────────
export default function AlertBox({
  visible = false,
  type = "info", // "success" | "error" | "warning" | "info" | "confirm"
  title,
  message,
  confirmText = "OK",
  cancelText = "Cancel",
  onConfirm,
  onCancel,
  showCancel = false,
}) {
  const scale = useRef(new Animated.Value(0.9)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scale, {
          toValue: 1,
          useNativeDriver: true,
          tension: 65,
          friction: 9,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(scale, {
          toValue: 0.9,
          duration: 140,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 140,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const config = TYPE_CONFIG[type] || TYPE_CONFIG.info;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      statusBarTranslucent
    >
      {/* Backdrop */}
      <Animated.View style={[styles.backdrop, { opacity }]}>
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={showCancel ? onCancel : undefined}
        />

        {/* Card */}
        <Animated.View
          style={[styles.card, { transform: [{ scale }], opacity }]}
        >
          {/* Icon badge */}
          <View style={[styles.iconBadge, { backgroundColor: config.bg }]}>
            <Text style={[styles.iconText, { color: config.color }]}>
              {config.icon}
            </Text>
          </View>

          {/* Content */}
          {title && <Text style={styles.title}>{title}</Text>}
          {message && <Text style={styles.message}>{message}</Text>}

          {/* Divider */}
          <View style={styles.divider} />

          {/* Buttons */}
          <View style={[styles.btnRow, showCancel && styles.btnRowDouble]}>
            {showCancel && (
              <TouchableOpacity
                style={styles.btnCancel}
                onPress={onCancel}
                activeOpacity={0.75}
              >
                <Text style={styles.btnCancelText}>{cancelText}</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[
                styles.btnConfirm,
                { backgroundColor: config.color },
                showCancel && styles.btnConfirmHalf,
              ]}
              onPress={onConfirm}
              activeOpacity={0.8}
            >
              <Text style={styles.btnConfirmText}>{confirmText}</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: C.overlay,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: Spacing.xxl,
  },

  card: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: C.surface,
    borderRadius: 20,
    paddingTop: Spacing.xxl,
    paddingHorizontal: Spacing.xxl,
    paddingBottom: Spacing.lg,
    alignItems: "center",
    shadowColor: C.surface,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 8,
  },

  iconBadge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  iconText: {
    fontSize: 22,
    fontWeight: Typography.bold,
    lineHeight: 26,
  },

  title: {
    fontSize: Typography.xxl,
    fontWeight: Typography.bold,
    color: C.text,
    textAlign: "center",
    marginBottom: Spacing.sm,
  },
  message: {
    fontSize: Typography.md,
    color: C.muted,
    textAlign: "center",
    lineHeight: 21,
    marginBottom: Spacing.lg,
  },

  divider: {
    width: "100%",
    height: 1,
    backgroundColor: C.border,
    marginBottom: Spacing.lg,
  },

  btnRow: {
    width: "100%",
  },
  btnRowDouble: {
    flexDirection: "row",
    gap: Spacing.sm,
  },

  btnConfirm: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: BorderRadius.lg,
    alignItems: "center",
  },
  btnConfirmHalf: {
    flex: 1,
  },
  btnConfirmText: {
    color: C.surface,
    fontSize: Typography.md,
    fontWeight: Typography.bold,
  },

  btnCancel: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: BorderRadius.lg,
    alignItems: "center",
    backgroundColor: C.bg,
    borderWidth: 1,
    borderColor: C.border,
  },
  btnCancelText: {
    color: C.text,
    fontSize: Typography.md,
    fontWeight: Typography.semibold,
  },
});
