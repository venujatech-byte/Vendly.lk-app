import { Check, Copy, MessageCircle, Send, X } from "lucide-react-native";
import React, { useState } from "react";
import {
  Alert,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { MESSAGE_TEMPLATES } from "@/constants/messageBlocks";
import { useAppTheme } from "@/context/ThemeContext";

export default function CustomerWhatsAppModal({
  visible,
  onClose,
  order,
  business,
}) {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();

  const [selectedTemplateId, setSelectedTemplateId] = useState(
    MESSAGE_TEMPLATES[0].id,
  );
  const [customText, setCustomText] = useState("");

  if (!visible || !order) return null;

  const phone = order.phoneNumber || order.customerSnapshot?.phoneNumber || "";

  const currentTemplate =
    MESSAGE_TEMPLATES.find((t) => t.id === selectedTemplateId) ||
    MESSAGE_TEMPLATES[0];

  const activeText = customText || currentTemplate.getText(order, business);

  function handleSelectTemplate(t) {
    setSelectedTemplateId(t.id);
    setCustomText(t.getText(order, business));
  }

  function handleSendWhatsApp() {
    if (!phone) {
      Alert.alert("No Phone Number", "This order does not have a valid customer phone number.");
      return;
    }

    const cleanPhone = phone.replace(/[^\d]/g, "");
    const formatted = cleanPhone.startsWith("0")
      ? `94${cleanPhone.slice(1)}`
      : cleanPhone;

    Linking.openURL(
      `https://wa.me/${formatted}?text=${encodeURIComponent(activeText)}`,
    );
    onClose();
  }

  const styles = createStyles(colors, insets.bottom);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <View style={styles.header}>
            <View style={styles.headerTitleWrap}>
              <MessageCircle size={20} color="#10b981" />
              <Text style={styles.headerTitle}>Send WhatsApp Message</Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={8}>
              <X size={20} color={colors.muted} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.content}>
            <Text style={styles.description}>
              Select a message template to send to{" "}
              <Text style={{ fontWeight: "700", color: colors.textStrong }}>
                {order.customerName} ({phone})
              </Text>
              :
            </Text>

            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.templatesRow}>
                {MESSAGE_TEMPLATES.map((t) => (
                  <TouchableOpacity
                    key={t.id}
                    style={[
                      styles.templateChip,
                      selectedTemplateId === t.id && styles.templateChipActive,
                    ]}
                    onPress={() => handleSelectTemplate(t)}
                  >
                    <Text
                      style={[
                        styles.templateChipText,
                        selectedTemplateId === t.id &&
                          styles.templateChipTextActive,
                      ]}
                    >
                      {t.title}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <View style={styles.messageBox}>
              <TextInput
                style={styles.messageInput}
                value={activeText}
                onChangeText={setCustomText}
                multiline
                numberOfLines={7}
                placeholder="Type your message here..."
                placeholderTextColor={colors.subtle}
              />
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.sendBtn}
              onPress={handleSendWhatsApp}
            >
              <Send size={16} color="#ffffff" />
              <Text style={styles.sendBtnText}>Open in WhatsApp</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function createStyles(colors, bottomInset) {
  return StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.55)",
      justifyContent: "flex-end",
    },
    sheet: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      maxHeight: "88%",
      paddingBottom: Math.max(bottomInset, 16),
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 18,
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    headerTitleWrap: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    headerTitle: {
      fontSize: 16,
      fontWeight: "700",
      color: colors.textStrong,
    },
    content: {
      padding: 18,
      gap: 14,
    },
    description: {
      fontSize: 13,
      color: colors.muted,
      lineHeight: 18,
    },
    templatesRow: {
      flexDirection: "row",
      gap: 8,
    },
    templateChip: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 8,
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
    },
    templateChipActive: {
      backgroundColor: "#ecfdf5",
      borderColor: "#10b981",
    },
    templateChipText: {
      fontSize: 12,
      fontWeight: "600",
      color: colors.muted,
    },
    templateChipTextActive: {
      color: "#059669",
      fontWeight: "700",
    },
    messageBox: {
      backgroundColor: colors.background,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 12,
    },
    messageInput: {
      fontSize: 13,
      color: colors.textStrong,
      lineHeight: 19,
      textAlignVertical: "top",
      minHeight: 140,
    },
    footer: {
      flexDirection: "row",
      gap: 12,
      paddingHorizontal: 18,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    cancelBtn: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: "center",
    },
    cancelBtnText: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.text,
    },
    sendBtn: {
      flex: 2,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      backgroundColor: "#10b981",
      paddingVertical: 12,
      borderRadius: 10,
    },
    sendBtnText: {
      color: "#ffffff",
      fontSize: 14,
      fontWeight: "700",
    },
  });
}
