import React, { createContext, useContext, useState, useRef } from "react";
import { View, Text, StyleSheet, Animated, TouchableOpacity } from "react-native";
import { C, Families, Brutalist } from "../constants/theme";
import AppIcon from "../components/AppIcon";

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState("");
  const [type, setType] = useState("info"); // success, error, info
  const slideAnim = useRef(new Animated.Value(-150)).current;
  const timeoutRef = useRef(null);

  const showToast = (msg, toastType = "info", duration = 3000) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    setMessage(msg);
    setType(toastType);
    setVisible(true);

    Animated.spring(slideAnim, {
      toValue: 60, // slide to top: 60
      useNativeDriver: true,
      tension: 40,
      friction: 6,
    }).start();

    timeoutRef.current = setTimeout(() => {
      hideToast();
    }, duration);
  };

  const hideToast = () => {
    Animated.timing(slideAnim, {
      toValue: -150,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      setVisible(false);
    });
  };

  // Determine styles based on type
  const getToastStyle = () => {
    switch (type) {
      case "success":
        return { bg: "#5A7A4A", text: "#FFFFFF", icon: "circleCheck" };
      case "error":
        return { bg: "#E4572E", text: "#FFFFFF", icon: "alertTriangle" };
      case "info":
      default:
        return { bg: C.accent, text: C.ink, icon: "info" };
    }
  };

  const toastInfo = getToastStyle();

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {visible && (
        <Animated.View
          style={[
            styles.toastContainer,
            {
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <TouchableOpacity
            style={[styles.toastCard, { backgroundColor: toastInfo.bg }]}
            onPress={hideToast}
            activeOpacity={0.9}
          >
            <View style={styles.toastIcon}>
              <AppIcon name={toastInfo.icon} size={18} color={toastInfo.text} />
            </View>
            <Text style={[styles.toastText, { color: toastInfo.text }]}>
              {message}
            </Text>
          </TouchableOpacity>
        </Animated.View>
      )}
    </ToastContext.Provider>
  );
}

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
};

const styles = StyleSheet.create({
  toastContainer: {
    position: "absolute",
    left: 20,
    right: 20,
    zIndex: 99999,
    elevation: 10,
  },
  toastCard: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: C.ink,
    shadowColor: C.ink,
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
    gap: 12,
  },
  toastIcon: {
    justifyContent: "center",
    alignItems: "center",
  },
  toastText: {
    flex: 1,
    fontSize: 13,
    fontFamily: Families.bold,
    lineHeight: 18,
  },
});
