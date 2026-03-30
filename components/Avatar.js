// components/Avatar.js
import { View, Text, Image, StyleSheet } from "react-native";
import { C, Typography } from "../constants/theme";

export default function Avatar({ uri, username, size = 40 }) {
  const radius = size / 2;
  const fontSize = size * 0.38;

  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={{ width: size, height: size, borderRadius: radius }}
      />
    );
  }
  return (
    <View
      style={[
        styles.fallback,
        { width: size, height: size, borderRadius: radius },
      ]}
    >
      <Text style={[styles.letter, { fontSize }]}>
        {username?.[0]?.toUpperCase() ?? "?"}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: {
    backgroundColor: C.sand,
    justifyContent: "center",
    alignItems: "center",
  },
  letter: { fontWeight: Typography.bold, color: C.text },
});
