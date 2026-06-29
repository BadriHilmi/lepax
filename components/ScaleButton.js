import React, { useRef } from "react";
import { Animated, TouchableWithoutFeedback } from "react-native";

export default function ScaleButton({ children, onPress, style, disabled }) {
  const scaleValue = useRef(new Animated.Value(1)).current;

  const onPressIn = () => {
    if (disabled) return;
    Animated.spring(scaleValue, {
      toValue: 0.94,
      useNativeDriver: true,
      tension: 180,
      friction: 7,
    }).start();
  };

  const onPressOut = () => {
    Animated.spring(scaleValue, {
      toValue: 1,
      useNativeDriver: true,
      tension: 180,
      friction: 7,
    }).start();
  };

  return (
    <TouchableWithoutFeedback
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      disabled={disabled}
    >
      <Animated.View style={[{ transform: [{ scale: scaleValue }] }, style]}>
        {children}
      </Animated.View>
    </TouchableWithoutFeedback>
  );
}
