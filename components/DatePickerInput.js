// components/DatePickerInput.js
import { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons as Icon } from "@expo/vector-icons";
import DateTimePickerModal from "react-native-modal-datetime-picker";
import { C, Typography, Spacing, BorderRadius } from "../constants/theme";

const DatePickerInput = ({
  label,
  value,
  onChange,
  mode = "date",
  required = false,
  minimumDate,
  maximumDate,
  placeholder = "Select date",
}) => {
  const [isPickerVisible, setPickerVisible] = useState(false);

  const showPicker = () => setPickerVisible(true);
  const hidePicker = () => setPickerVisible(false);

  const handleConfirm = (selectedDate) => {
    hidePicker();
    if (onChange) onChange(selectedDate);
  };

  const formatDate = (date) => {
    if (!date) return "";
    const d = new Date(date);
    if (mode === "time") {
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }
    if (mode === "datetime") {
      return d.toLocaleString([], {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    }
    return d.toLocaleDateString([], {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getIcon = () => {
    switch (mode) {
      case "time":
        return "time-outline";
      case "datetime":
        return "calendar-outline";
      default:
        return "calendar-outline";
    }
  };

  return (
    <View style={styles.container}>
      {label && (
        <Text style={styles.label}>
          {label}
          {required && <Text style={styles.required}> *</Text>}
        </Text>
      )}
      <TouchableOpacity
        style={styles.input}
        onPress={showPicker}
        activeOpacity={0.8}
      >
        <Icon name="calendar" size={18} color={C.muted} />
        <Text style={[styles.inputText, !value && styles.placeholderText]}>
          {value ? formatDate(value) : placeholder}
        </Text>
        <Icon name="chevron-down" size={18} color={C.muted} />
      </TouchableOpacity>
      <DateTimePickerModal
        isVisible={isPickerVisible}
        mode={mode}
        date={value || new Date()}
        minimumDate={minimumDate}
        maximumDate={maximumDate}
        onConfirm={handleConfirm}
        onCancel={hidePicker}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { marginBottom: Spacing.md },
  label: {
    fontSize: Typography.sm,
    fontWeight: Typography.semibold,
    color: C.text,
    marginBottom: Spacing.xs,
  },
  required: { color: C.danger },
  input: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    minHeight: 48,
  },
  inputText: {
    flex: 1,
    fontSize: Typography.md,
    color: C.text,
  },
  placeholderText: {
    color: C.muted,
  },
});

export default DatePickerInput;
