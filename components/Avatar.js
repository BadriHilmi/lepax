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
        style={[
          styles.image,
          { width: size, height: size, borderRadius: radius },
        ]}
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
  image: {
    borderWidth: 2,
    borderColor: C.surface,
  },
  fallback: {
    backgroundColor: C.primary,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: C.surface,
  },
  letter: { fontWeight: Typography.bold, color: C.surface },
});
