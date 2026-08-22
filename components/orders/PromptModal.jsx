import { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { useAppTheme } from "../../context/ThemeContext";

// Mobile stand-in for the web's window.prompt() calls.
export default function PromptModal({
  visible,
  title,
  description,
  defaultValue = "",
  placeholder,
  confirmLabel = "Submit",
  isDanger = false,
  onCancel,
  onConfirm,
}) {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  const [value, setValue] = useState(defaultValue);

  useEffect(() => {
    if (visible) setValue(defaultValue);
  }, [visible, defaultValue]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={onCancel} />

        <View style={styles.card}>
          <Text style={styles.title}>{title}</Text>
          {description ? <Text style={styles.description}>{description}</Text> : null}

          <TextInput
            style={styles.input}
            value={value}
            onChangeText={setValue}
            placeholder={placeholder}
            placeholderTextColor={colors.subtle}
            multiline
            autoFocus
          />

          <View style={styles.actions}>
            <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.confirmButton, isDanger && styles.confirmButtonDanger]}
              onPress={() => onConfirm(value)}
            >
              <Text style={styles.confirmText}>{confirmLabel}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function createStyles(colors) {
  return StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.5)",
      alignItems: "center",
      justifyContent: "center",
      padding: 24,
    },
    card: {
      width: "100%",
      backgroundColor: colors.surface,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 18,
    },
    title: {
      color: colors.textStrong,
      fontSize: 16,
      fontWeight: "700",
      marginBottom: 4,
    },
    description: {
      color: colors.muted,
      fontSize: 13,
      marginBottom: 12,
    },
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
      minHeight: 72,
      textAlignVertical: "top",
      color: colors.textStrong,
      backgroundColor: colors.background,
      marginTop: 8,
    },
    actions: {
      flexDirection: "row",
      gap: 10,
      marginTop: 16,
    },
    cancelButton: {
      flex: 1,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      paddingVertical: 12,
      alignItems: "center",
    },
    cancelText: {
      color: colors.text,
      fontWeight: "600",
    },
    confirmButton: {
      flex: 1,
      backgroundColor: colors.accent,
      borderRadius: 10,
      paddingVertical: 12,
      alignItems: "center",
    },
    confirmButtonDanger: {
      backgroundColor: colors.danger,
    },
    confirmText: {
      color: "#ffffff",
      fontWeight: "700",
    },
  });
}
