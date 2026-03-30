// components/VibeTag.js
import { View, Text, StyleSheet } from "react-native";
import { VIBE_COLORS, C, Typography } from "../constants/theme";

export default function VibeTag({ label }) {
  const vc = VIBE_COLORS[label] || { bg: C.sand, text: C.muted };
  return (
    <View style={[styles.tag, { backgroundColor: vc.bg }]}>
      <Text style={[styles.text, { color: vc.text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tag: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  text: { fontSize: 12, fontWeight: Typography.medium },
});
