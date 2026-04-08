import { View, Text } from "react-native";

export default function FormField({
  label,
  children,
  containerStyle,
  labelStyle,
  required = false,
}) {
  return (
    <View style={[{ gap: 6 }, containerStyle]}>
      {label ? (
        <Text style={labelStyle}>
          {label}
          {required ? " *" : ""}
        </Text>
      ) : null}
      {children}
    </View>
  );
}
