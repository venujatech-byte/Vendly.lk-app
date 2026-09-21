import { router } from "expo-router";
import {
  ArrowRight,
  Bot,
  Check,
  ChevronRight,
  Lightbulb,
  Send,
  Sparkles,
  User,
  X,
} from "lucide-react-native";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/authContextValue";
import { useAppTheme } from "@/context/ThemeContext";
import {
  QUICK_PROMPTS,
  sendBusinessAssistantMessage,
} from "@/services/businessAssistantService";

export default function BusinessAssistantModal({ visible, onClose }) {
  const { colors, theme } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { business } = useAuth();

  const [messages, setMessages] = useState([
    {
      id: "welcome",
      role: "assistant",
      text: `Hi there! I'm your Vendly AI assistant. Ask me anything about your orders, low stock items, top revenue products, or courier performance.`,
      suggestions: QUICK_PROMPTS.slice(0, 3),
    },
  ]);
  const [draft, setDraft] = useState("");
  const [isSending, setIsSending] = useState(false);
  const scrollViewRef = useRef(null);

  useEffect(() => {
    if (visible) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [visible, messages]);

  if (!visible) return null;

  async function handleSend(textToSend) {
    const text = (textToSend || draft).trim();
    if (!text || !business?.id || isSending) return;

    const userMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      text,
    };

    setMessages((prev) => [...prev, userMessage]);
    setDraft("");
    setIsSending(true);

    try {
      const response = await sendBusinessAssistantMessage(business.id, {
        message: text,
      });

      const assistantMessage = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        text: response.message || response.reply || "Here is the summary.",
        cards: response.cards || [],
        suggestions: response.suggestions || [],
        pendingAction: response.pendingAction,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          role: "assistant",
          text:
            err.message ||
            "I could not process that request right now. Please try again.",
        },
      ]);
    } finally {
      setIsSending(false);
    }
  }

  async function handleConfirmAction(action, messageId) {
    if (!business?.id || isSending) return;

    setIsSending(true);
    try {
      const response = await sendBusinessAssistantMessage(business.id, {
        confirmedAction: action,
      });

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId
            ? { ...msg, pendingAction: null, actionState: "completed" }
            : msg,
        ),
      );

      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          text: response.message || "Action confirmed and processed successfully.",
        },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          role: "assistant",
          text: `Action failed: ${err.message}`,
        },
      ]);
    } finally {
      setIsSending(false);
    }
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
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.sheetContainer}
        >
          <Pressable style={styles.sheet} onPress={() => {}}>
            <View style={styles.header}>
              <View style={styles.headerTitleWrap}>
                <View style={styles.botIconWrap}>
                  <Sparkles size={16} color="#ffffff" />
                </View>
                <View>
                  <Text style={styles.headerTitle}>Business Assistant</Text>
                  <Text style={styles.headerSubtitle}>
                    AI Store Copilot • Vendly Intelligence
                  </Text>
                </View>
              </View>
              <TouchableOpacity onPress={onClose} hitSlop={8}>
                <X size={20} color={colors.muted} />
              </TouchableOpacity>
            </View>

            <ScrollView
              ref={scrollViewRef}
              contentContainerStyle={styles.messagesContainer}
              keyboardShouldPersistTaps="handled"
            >
              {messages.map((msg) => {
                const isAssistant = msg.role === "assistant";

                return (
                  <View
                    key={msg.id}
                    style={[
                      styles.messageRow,
                      isAssistant
                        ? styles.assistantMessageRow
                        : styles.userMessageRow,
                    ]}
                  >
                    <View
                      style={[
                        styles.messageBubble,
                        isAssistant
                          ? styles.assistantBubble
                          : styles.userBubble,
                      ]}
                    >
                      <Text
                        style={[
                          styles.messageText,
                          isAssistant
                            ? styles.assistantMessageText
                            : styles.userMessageText,
                        ]}
                      >
                        {msg.text}
                      </Text>

                      {/* Display action/summary cards */}
                      {msg.cards?.length > 0 && (
                        <View style={styles.cardsGrid}>
                          {msg.cards.map((card, idx) => (
                            <TouchableOpacity
                              key={idx}
                              style={styles.cardItem}
                              onPress={() => {
                                if (card.navigateTo) {
                                  onClose();
                                  router.push(card.navigateTo);
                                }
                              }}
                            >
                              <View style={{ flex: 1 }}>
                                <Text style={styles.cardTitle}>{card.title}</Text>
                                {card.subtitle && (
                                  <Text style={styles.cardSubtitle}>
                                    {card.subtitle}
                                  </Text>
                                )}
                              </View>
                              <Text style={styles.cardValue}>{card.value}</Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      )}

                      {/* Pending Action Confirmation */}
                      {msg.pendingAction && (
                        <View style={styles.confirmationBox}>
                          <Text style={styles.confirmationTitle}>
                            Confirmation Required
                          </Text>
                          <Text style={styles.confirmationLabel}>
                            {msg.pendingAction.label}
                          </Text>
                          <View style={styles.confirmButtons}>
                            <TouchableOpacity
                              style={styles.confirmBtn}
                              onPress={() =>
                                handleConfirmAction(msg.pendingAction, msg.id)
                              }
                              disabled={isSending}
                            >
                              <Check size={14} color="#ffffff" />
                              <Text style={styles.confirmBtnText}>Confirm</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={styles.cancelBtn}
                              onPress={() =>
                                setMessages((prev) =>
                                  prev.map((m) =>
                                    m.id === msg.id
                                      ? {
                                          ...m,
                                          pendingAction: null,
                                          actionState: "cancelled",
                                        }
                                      : m,
                                  ),
                                )
                              }
                            >
                              <Text style={styles.cancelBtnText}>Cancel</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      )}

                      {/* Suggestion Chips */}
                      {msg.suggestions?.length > 0 && (
                        <View style={styles.suggestionsRow}>
                          {msg.suggestions.map((suggestion, sIdx) => (
                            <TouchableOpacity
                              key={sIdx}
                              style={styles.suggestionChip}
                              onPress={() => handleSend(suggestion)}
                              disabled={isSending}
                            >
                              <Lightbulb size={12} color={colors.accent} />
                              <Text style={styles.suggestionText}>
                                {suggestion}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      )}
                    </View>
                  </View>
                );
              })}

              {isSending && (
                <View style={styles.assistantMessageRow}>
                  <View style={[styles.assistantBubble, styles.thinkingBubble]}>
                    <ActivityIndicator size="small" color={colors.accent} />
                    <Text style={styles.thinkingText}>Thinking...</Text>
                  </View>
                </View>
              )}
            </ScrollView>

            <View style={styles.composer}>
              <TextInput
                style={styles.input}
                value={draft}
                onChangeText={setDraft}
                placeholder="Ask about revenue, orders, stock..."
                placeholderTextColor={colors.subtle}
                returnKeyType="send"
                onSubmitEditing={() => handleSend()}
              />
              <TouchableOpacity
                style={[
                  styles.sendBtn,
                  !draft.trim() && styles.sendBtnDisabled,
                ]}
                onPress={() => handleSend()}
                disabled={!draft.trim() || isSending}
              >
                <Send
                  size={16}
                  color={draft.trim() ? "#ffffff" : colors.subtle}
                />
              </TouchableOpacity>
            </View>
          </Pressable>
        </KeyboardAvoidingView>
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
    sheetContainer: {
      width: "100%",
    },
    sheet: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      height: 600,
      maxHeight: "92%",
      paddingBottom: Math.max(bottomInset, 16),
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 18,
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    headerTitleWrap: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    botIconWrap: {
      width: 34,
      height: 34,
      borderRadius: 10,
      backgroundColor: colors.accent,
      alignItems: "center",
      justifyContent: "center",
    },
    headerTitle: {
      fontSize: 15,
      fontWeight: "700",
      color: colors.textStrong,
    },
    headerSubtitle: {
      fontSize: 11,
      color: colors.muted,
    },
    messagesContainer: {
      padding: 16,
      gap: 12,
    },
    messageRow: {
      flexDirection: "row",
    },
    assistantMessageRow: {
      justifyContent: "flex-start",
    },
    userMessageRow: {
      justifyContent: "flex-end",
    },
    messageBubble: {
      maxWidth: "85%",
      borderRadius: 16,
      padding: 12,
      gap: 8,
    },
    assistantBubble: {
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
      borderBottomLeftRadius: 4,
    },
    userBubble: {
      backgroundColor: colors.accent,
      borderBottomRightRadius: 4,
    },
    messageText: {
      fontSize: 13,
      lineHeight: 19,
    },
    assistantMessageText: {
      color: colors.textStrong,
    },
    userMessageText: {
      color: "#ffffff",
      fontWeight: "500",
    },
    thinkingBubble: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      paddingVertical: 8,
      paddingHorizontal: 14,
    },
    thinkingText: {
      fontSize: 12,
      color: colors.muted,
      fontStyle: "italic",
    },
    cardsGrid: {
      gap: 6,
      marginTop: 6,
    },
    cardItem: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.surfaceSoft,
      padding: 10,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
    },
    cardTitle: {
      fontSize: 12,
      fontWeight: "700",
      color: colors.textStrong,
    },
    cardSubtitle: {
      fontSize: 10,
      color: colors.muted,
    },
    cardValue: {
      fontSize: 13,
      fontWeight: "700",
      color: colors.accent,
      marginLeft: 8,
    },
    confirmationBox: {
      backgroundColor: colors.surfaceSoft,
      borderWidth: 1,
      borderColor: colors.accent,
      borderRadius: 10,
      padding: 10,
      gap: 6,
      marginTop: 4,
    },
    confirmationTitle: {
      fontSize: 11,
      fontWeight: "700",
      color: colors.accent,
    },
    confirmationLabel: {
      fontSize: 12,
      color: colors.textStrong,
    },
    confirmButtons: {
      flexDirection: "row",
      gap: 8,
      marginTop: 4,
    },
    confirmBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      backgroundColor: colors.accent,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 6,
    },
    confirmBtnText: {
      color: "#ffffff",
      fontSize: 12,
      fontWeight: "700",
    },
    cancelBtn: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: colors.border,
    },
    cancelBtnText: {
      color: colors.text,
      fontSize: 12,
    },
    suggestionsRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 6,
      marginTop: 6,
    },
    suggestionChip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      backgroundColor: colors.surfaceSoft,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.border,
    },
    suggestionText: {
      fontSize: 11,
      color: colors.textStrong,
      fontWeight: "500",
    },
    composer: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      paddingHorizontal: 16,
      paddingTop: 10,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    input: {
      flex: 1,
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 20,
      paddingHorizontal: 16,
      paddingVertical: 9,
      fontSize: 13,
      color: colors.textStrong,
    },
    sendBtn: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: colors.accent,
      alignItems: "center",
      justifyContent: "center",
    },
    sendBtnDisabled: {
      backgroundColor: colors.surfaceSoft,
    },
  });
}
