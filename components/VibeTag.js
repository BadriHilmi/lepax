import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { VIBE_COLORS, C, Families, Typography } from "../constants/theme";

const TILT_MAPPING = {
  chill: "-1.5deg",
  foodie: "1.2deg",
  adventure: "-1deg",
  budget: "1.8deg",
  spontaneous: "-2.2deg",
  luxury: "-0.8deg", // Subtle, elegant tilt
  culture: "1.5deg", // Artistic and historical
  nature: "-1.7deg", // Earthy, outdoorsy
  nightlife: "2.5deg", // High energy, dynamic tilt
  wellness: "-0.5deg", // Calming, almost perfectly balanced
  roadtrip: "2.0deg", // Quirky, on-the-move vibe
  sports: "1.0deg",
  Sports: "1.0deg", // Active, energetic tilt
};

export default function VibeTag({ label, onPress }) {
  const vc = VIBE_COLORS[label] || {
    bg: C.surfaceWarm,
    text: C.muted,
    border: C.border,
  };
  const rotation = TILT_MAPPING[label] ?? "0deg";

  const Content = (
    <View
      style={[
        styles.tag,
        {
          backgroundColor: vc.bg,
          transform: [{ rotate: rotation }],
        },
      ]}
    >
      <Text style={[styles.text, { color: vc.text }]}>{label}</Text>
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
        {Content}
      </TouchableOpacity>
    );
  }
  return Content;
}

const styles = StyleSheet.create({
  tag: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 4,
    borderWidth: 1.8,
    borderColor: C.ink,
    shadowColor: C.ink,
    shadowOffset: { width: 1.5, height: 1.5 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 1,
  },
  text: {
    fontSize: 10,
    fontFamily: Families.bold,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
});
