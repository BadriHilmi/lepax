// components/VibeTag.js
import { View, Text, StyleSheet } from "react-native";
import { VIBE_COLORS, C, Typography } from "../constants/theme";

export default function VibeTag({ label }) {
  const vc = VIBE_COLORS[label] || {
    bg: C.surfaceWarm,
    text: C.muted,
    border: C.border,
  };
  return (
    <View
      style={[
        styles.tag,
        { backgroundColor: vc.bg, borderColor: vc.border ?? vc.bg },
      ]}
    >
      <Text style={[styles.text, { color: vc.text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tag: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
  },
  text: {
    fontSize: 11,
    fontWeight: Typography.bold,
    textTransform: "uppercase",
  },
});
