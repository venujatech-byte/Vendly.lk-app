import { limitToLast, onValue, query, ref } from "firebase/database";
import {
  ArrowLeft,
  Bot,
  Check,
  CheckCheck,
  Languages,
  MessageCircle,
  MessageSquare,
  Pause,
  Phone,
  Play,
  RefreshCw,
  Search,
  Send,
  Sparkles,
  Trash2,
  User,
  X,
} from "lucide-react-native";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Linking,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import ScreenHeader from "@/components/ScreenHeader";
import { useAuth } from "@/context/authContextValue";
import { useAppTheme } from "@/context/ThemeContext";
import { rtdb } from "@/firebase/firebaseConfig";
import {
  deleteChatSession,
  getChatMessages,
  getChatSessions,
  markChatRead,
  sendSellerMessage,
  setChatAiPaused,
} from "@/services/messageService";

const LANGUAGE_LABELS = {
  en: "English",
  si: "Sinhala",
  ta: "Tamil",
};

function formatMessageTime(dateString) {
  if (!dateString) return "";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString("en-LK", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function formatSessionDate(dateString) {
  if (!dateString) return "";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "";
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  if (isToday) {
    return date.toLocaleTimeString("en-LK", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  }
  return date.toLocaleDateString("en-LK", {
    month: "short",
    day: "numeric",
  });
}

export default function MessagesTab() {
  const { colors, theme } = useAppTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(
    () => createStyles(colors, insets.bottom),
    [colors, insets.bottom],
  );
  const { business } = useAuth();

  const [sessions, setSessions] = useState([]);
  const [selectedSessionId, setSelectedSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [inputText, setInputText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isUpdatingAi, setIsUpdatingAi] = useState(false);

  const flatListRef = useRef(null);

  const selectedSession = useMemo(
    () => sessions.find((s) => s.id === selectedSessionId),
    [sessions, selectedSessionId],
  );

  const loadSessions = useCallback(
    async (quiet = false) => {
      if (!business?.id) {
        setIsLoadingSessions(false);
        return;
      }
      if (!quiet) setIsLoadingSessions(true);

      try {
        const response = await getChatSessions(business.id);
        const fetchedSessions = response?.sessions ?? [];
        setSessions(fetchedSessions);
      } catch (err) {
        // quiet error
      } finally {
        setIsLoadingSessions(false);
        setIsRefreshing(false);
      }
    },
    [business?.id],
  );

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  // Real-time listener for chat activity on RTDB
  useEffect(() => {
    if (!business?.id || !rtdb) return undefined;

    try {
      const activityRef = ref(rtdb, `businessChatActivity/${business.id}`);
      const unsubscribe = onValue(activityRef, (snapshot) => {
        const val = snapshot.val();
        if (val?.lastUpdated) {
          loadSessions(true);
        }
      });
      return () => unsubscribe();
    } catch {
      return undefined;
    }
  }, [business?.id, loadSessions]);

  // Load and listen to messages when a session is selected
  useEffect(() => {
    if (!business?.id || !selectedSessionId) {
      setMessages([]);
      return undefined;
    }

    setIsLoadingMessages(true);
    markChatRead(business.id, selectedSessionId).catch(() => {});

    // Initial fetch from API
    getChatMessages(business.id, selectedSessionId)
      .then((res) => {
        setMessages(res?.messages ?? []);
      })
      .catch(() => {})
      .finally(() => {
        setIsLoadingMessages(false);
      });

    // Real-time listener on RTDB
    let unsubscribeRtdb;
    try {
      if (rtdb) {
        const chatQuery = query(
          ref(rtdb, `chatMessages/${selectedSessionId}`),
          limitToLast(25),
        );
        unsubscribeRtdb = onValue(chatQuery, (snapshot) => {
          const val = snapshot.val();
          if (val) {
            const list = Object.entries(val).map(([id, item]) => ({
              id,
              ...item,
            }));
            list.sort(
              (a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0),
            );
            setMessages(list);
          }
        });
      }
    } catch {
      // RTDB connection fallback
    }

    return () => {
      if (unsubscribeRtdb) unsubscribeRtdb();
    };
  }, [business?.id, selectedSessionId]);

  async function handleSendMessage() {
    if (!business?.id || !selectedSessionId || !inputText.trim() || isSending) {
      return;
    }

    const textToSend = inputText.trim();
    setInputText("");
    setIsSending(true);

    try {
      const sentMsg = await sendSellerMessage(
        business.id,
        selectedSessionId,
        textToSend,
      );
      if (sentMsg) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === sentMsg.id)) return prev;
          return [...prev, sentMsg];
        });
      }
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 150);
    } catch (err) {
      Alert.alert("Failed to send", err.message ?? "Could not send message.");
      setInputText(textToSend);
    } finally {
      setIsSending(false);
    }
  }

  async function handleToggleAi(newValue) {
    if (!business?.id || !selectedSessionId || isUpdatingAi) return;

    setIsUpdatingAi(true);
    try {
      await setChatAiPaused(business.id, selectedSessionId, newValue);
      setSessions((prev) =>
        prev.map((s) =>
          s.id === selectedSessionId ? { ...s, aiPaused: newValue } : s,
        ),
      );
    } catch (err) {
      Alert.alert("Update failed", "Could not toggle AI status.");
    } finally {
      setIsUpdatingAi(false);
    }
  }

  function handleDeleteSession() {
    if (!business?.id || !selectedSessionId) return;

    Alert.alert(
      "Delete Conversation?",
      "This will remove the entire chat history for this customer.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteChatSession(business.id, selectedSessionId);
              setSessions((prev) =>
                prev.filter((s) => s.id !== selectedSessionId),
              );
              setSelectedSessionId(null);
            } catch (err) {
              Alert.alert("Delete failed", err.message);
            }
          },
        },
      ],
    );
  }

  function handleCallCustomer() {
    const phone =
      selectedSession?.customer?.normalizedPhone ||
      selectedSession?.customer?.phone;
    if (phone) Linking.openURL(`tel:${phone}`);
  }

  function handleWhatsAppCustomer() {
    const rawPhone =
      selectedSession?.customer?.normalizedPhone ||
      selectedSession?.customer?.phone;
    if (!rawPhone) return;
    const clean = rawPhone.replace(/[^\d]/g, "");
    const formatted = clean.startsWith("0") ? `94${clean.slice(1)}` : clean;
    const customerName = selectedSession?.customer?.name || "there";
    Linking.openURL(
      `https://wa.me/${formatted}?text=Hi%20${encodeURIComponent(
        customerName,
      )},%20we%20are%20reaching%20out%20from%20Vendly!`,
    );
  }

  const filteredSessions = useMemo(() => {
    if (!searchQuery.trim()) return sessions;
    const q = searchQuery.toLowerCase().trim();
    return sessions.filter((s) => {
      const name = (s.customer?.name || "").toLowerCase();
      const phone = (s.customer?.phone || s.customer?.normalizedPhone || "").toLowerCase();
      const lastText = (s.lastMessage?.text || "").toLowerCase();
      return name.includes(q) || phone.includes(q) || lastText.includes(q);
    });
  }, [sessions, searchQuery]);

  const totalUnread = useMemo(() => {
    return sessions.reduce((sum, s) => sum + (s.unreadCount || 0), 0);
  }, [sessions]);

  // ==================== RENDER CONVERSATION VIEW ====================
  if (selectedSessionId && selectedSession) {
    const customer = selectedSession.customer ?? {};
    const customerName = customer.name || "Customer";
    const phone = customer.normalizedPhone || customer.phone || "No phone";
    const aiPaused = selectedSession.aiPaused ?? false;

    return (
      <KeyboardAvoidingView
        style={styles.screen}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {/* Chat Top Header */}
        <View style={styles.chatHeader}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => setSelectedSessionId(null)}
          >
            <ArrowLeft size={20} color={colors.text} />
          </TouchableOpacity>

          <View style={styles.chatHeaderAvatar}>
            <Text style={styles.avatarInitials}>
              {customerName.slice(0, 2).toUpperCase()}
            </Text>
          </View>

          <View style={styles.chatHeaderInfo}>
            <Text style={styles.chatHeaderName} numberOfLines={1}>
              {customerName}
            </Text>
            <Text style={styles.chatHeaderPhone} numberOfLines={1}>
              {phone}
            </Text>
          </View>

          <View style={styles.chatHeaderActions}>
            <TouchableOpacity
              style={styles.headerIconBtn}
              onPress={handleCallCustomer}
            >
              <Phone size={17} color={colors.text} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.headerIconBtn, { backgroundColor: "#ecfdf5" }]}
              onPress={handleWhatsAppCustomer}
            >
              <MessageCircle size={17} color="#10b981" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.headerIconBtn}
              onPress={handleDeleteSession}
            >
              <Trash2 size={17} color={colors.danger} />
            </TouchableOpacity>
          </View>
        </View>

        {/* AI Auto-Reply Control Banner */}
        <View
          style={[
            styles.aiBanner,
            aiPaused ? styles.aiBannerPaused : styles.aiBannerActive,
          ]}
        >
          <View style={styles.aiBannerLeft}>
            {aiPaused ? (
              <Pause size={15} color="#d97706" />
            ) : (
              <Sparkles size={15} color={colors.accent} />
            )}
            <View>
              <Text style={styles.aiBannerTitle}>
                {aiPaused ? "AI Assistant Paused" : "AI Assistant Active"}
              </Text>
              <Text style={styles.aiBannerSubtitle}>
                {aiPaused
                  ? "You are handling this customer manually"
                  : "AI will auto-reply using your catalog & policies"}
              </Text>
            </View>
          </View>
          <Switch
            value={!aiPaused}
            onValueChange={(active) => handleToggleAi(!active)}
            trackColor={{ false: "#cbd5e1", true: colors.accent }}
            thumbColor="#ffffff"
          />
        </View>

        {/* Messages List */}
        {isLoadingMessages ? (
          <View style={styles.loadingArea}>
            <ActivityIndicator size="large" color={colors.accent} />
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item, index) => item.id || String(index)}
            contentContainerStyle={styles.messagesList}
            onContentSizeChange={() =>
              flatListRef.current?.scrollToEnd({ animated: false })
            }
            renderItem={({ item }) => {
              const isSeller = item.sender === "seller";
              const isAssistant = item.sender === "assistant";
              const isCustomer = !isSeller && !isAssistant;

              return (
                <View
                  style={[
                    styles.messageRow,
                    isSeller
                      ? styles.messageRowSeller
                      : isAssistant
                      ? styles.messageRowAssistant
                      : styles.messageRowCustomer,
                  ]}
                >
                  <View
                    style={[
                      styles.messageBubble,
                      isSeller
                        ? styles.bubbleSeller
                        : isAssistant
                        ? styles.bubbleAssistant
                        : styles.bubbleCustomer,
                    ]}
                  >
                    {isAssistant && (
                      <View style={styles.senderBadge}>
                        <Bot size={12} color="#ffffff" />
                        <Text style={styles.senderBadgeText}>AI Assistant</Text>
                      </View>
                    )}
                    {isSeller && (
                      <View style={styles.senderBadgeSeller}>
                        <Text style={styles.senderBadgeSellerText}>You</Text>
                      </View>
                    )}

                    <Text
                      style={[
                        styles.messageText,
                        isSeller
                          ? styles.textSeller
                          : isAssistant
                          ? styles.textAssistant
                          : styles.textCustomer,
                      ]}
                    >
                      {item.text}
                    </Text>

                    {item.translatedText &&
                      item.translatedText !== item.text && (
                        <View style={styles.translationBox}>
                          <Languages size={11} color="rgba(255,255,255,0.75)" />
                          <Text style={styles.translationText}>
                            {item.translatedText}
                          </Text>
                        </View>
                      )}

                    <View style={styles.bubbleFooter}>
                      <Text
                        style={[
                          styles.bubbleTime,
                          isSeller || isAssistant
                            ? styles.timeDark
                            : styles.timeLight,
                        ]}
                      >
                        {formatMessageTime(item.createdAt)}
                      </Text>
                      {isSeller && (
                        <CheckCheck
                          size={12}
                          color="rgba(255,255,255,0.8)"
                          style={{ marginLeft: 3 }}
                        />
                      )}
                    </View>
                  </View>
                </View>
              );
            }}
          />
        )}

        {/* Message Input Bar */}
        <View style={styles.composer}>
          <TextInput
            style={styles.composerInput}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Type your message..."
            placeholderTextColor={colors.subtle}
            multiline
            maxLength={1000}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              (!inputText.trim() || isSending) && styles.sendButtonDisabled,
            ]}
            onPress={handleSendMessage}
            disabled={!inputText.trim() || isSending}
          >
            {isSending ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Send size={18} color="#ffffff" />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    );
  }

  // ==================== RENDER SESSIONS LIST VIEW ====================
  return (
    <View style={styles.screen}>
      <ScreenHeader title="Messages" />

      {/* Top Banner with Stats & Live Status */}
      <View style={styles.topBar}>
        <View style={styles.topBarContent}>
          <Text style={styles.topBarTitle}>Customer Chats & AI Inbox</Text>
          <Text style={styles.topBarSubtitle}>
            Live conversations from your online storefront and chatbot
          </Text>
        </View>
        {totalUnread > 0 && (
          <View style={styles.unreadPill}>
            <Text style={styles.unreadPillText}>{totalUnread} Unread</Text>
          </View>
        )}
      </View>

      {/* Search Bar */}
      <View style={styles.searchSection}>
        <View style={styles.searchBox}>
          <Search size={16} color={colors.subtle} />
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search conversations by customer or phone..."
            placeholderTextColor={colors.subtle}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <X size={16} color={colors.subtle} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Sessions FlatList */}
      {isLoadingSessions ? (
        <View style={styles.loadingArea}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={styles.loadingText}>Syncing chat sessions...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredSessions}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => {
                setIsRefreshing(true);
                loadSessions(true);
              }}
            />
          }
          contentContainerStyle={styles.sessionsList}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MessageSquare size={44} color={colors.subtle} />
              <Text style={styles.emptyTitle}>No messages yet</Text>
              <Text style={styles.emptySubtitle}>
                When customers chat on your storefront or inquire about products,
                conversations will appear here in real-time.
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const customerName = item.customer?.name || "Customer";
            const phone =
              item.customer?.normalizedPhone ||
              item.customer?.phone ||
              "";
            const lastMsg = item.lastMessage?.text || "Started a conversation";
            const time = formatSessionDate(item.lastMessage?.createdAt);
            const unread = item.unreadCount || 0;
            const isAiPaused = item.aiPaused || false;

            return (
              <TouchableOpacity
                style={[
                  styles.sessionCard,
                  unread > 0 && styles.sessionCardUnread,
                ]}
                onPress={() => setSelectedSessionId(item.id)}
                activeOpacity={0.7}
              >
                <View style={styles.sessionAvatar}>
                  <Text style={styles.avatarInitials}>
                    {customerName.slice(0, 2).toUpperCase()}
                  </Text>
                  {unread > 0 && <View style={styles.avatarBadge} />}
                </View>

                <View style={styles.sessionBody}>
                  <View style={styles.sessionTopRow}>
                    <Text
                      style={[
                        styles.sessionName,
                        unread > 0 && styles.sessionNameBold,
                      ]}
                      numberOfLines={1}
                    >
                      {customerName}
                    </Text>
                    <Text style={styles.sessionTime}>{time}</Text>
                  </View>

                  {phone ? (
                    <Text style={styles.sessionPhone} numberOfLines={1}>
                      {phone}
                    </Text>
                  ) : null}

                  <View style={styles.sessionBottomRow}>
                    <Text
                      style={[
                        styles.sessionSnippet,
                        unread > 0 && styles.sessionSnippetBold,
                      ]}
                      numberOfLines={1}
                    >
                      {lastMsg}
                    </Text>

                    <View style={styles.badgesRow}>
                      {isAiPaused ? (
                        <View style={styles.aiPausedTag}>
                          <Text style={styles.aiPausedTagText}>AI Paused</Text>
                        </View>
                      ) : (
                        <View style={styles.aiActiveTag}>
                          <Sparkles size={10} color={colors.accent} />
                          <Text style={styles.aiActiveTagText}>AI Bot</Text>
                        </View>
                      )}

                      {unread > 0 && (
                        <View style={styles.unreadCountBadge}>
                          <Text style={styles.unreadCountText}>{unread}</Text>
                        </View>
                      )}
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </View>
  );
}

function createStyles(colors, bottomInset) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.background,
    },
    topBar: {
      paddingHorizontal: 16,
      paddingVertical: 12,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      backgroundColor: colors.surface,
    },
    topBarContent: {
      flex: 1,
    },
    topBarTitle: {
      fontSize: 16,
      fontWeight: "700",
      color: colors.text,
    },
    topBarSubtitle: {
      fontSize: 12,
      color: colors.muted,
      marginTop: 2,
    },
    unreadPill: {
      backgroundColor: colors.accent,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 12,
      marginLeft: 10,
    },
    unreadPillText: {
      color: "#ffffff",
      fontSize: 11,
      fontWeight: "700",
    },
    searchSection: {
      paddingHorizontal: 16,
      paddingVertical: 10,
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    searchBox: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.background,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 8,
    },
    searchInput: {
      flex: 1,
      fontSize: 13,
      color: colors.text,
      padding: 0,
    },
    sessionsList: {
      padding: 12,
      paddingBottom: 24,
    },
    sessionCard: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.surface,
      borderRadius: 14,
      padding: 12,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 12,
    },
    sessionCardUnread: {
      borderColor: colors.accent,
      backgroundColor: colors.surface,
    },
    sessionAvatar: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: colors.accent,
      alignItems: "center",
      justifyContent: "center",
      position: "relative",
    },
    avatarInitials: {
      color: "#ffffff",
      fontSize: 15,
      fontWeight: "700",
    },
    avatarBadge: {
      position: "absolute",
      top: -2,
      right: -2,
      width: 12,
      height: 12,
      borderRadius: 6,
      backgroundColor: colors.danger,
      borderWidth: 2,
      borderColor: colors.surface,
    },
    sessionBody: {
      flex: 1,
    },
    sessionTopRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    sessionName: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.text,
      flex: 1,
    },
    sessionNameBold: {
      fontWeight: "750",
      color: colors.text,
    },
    sessionTime: {
      fontSize: 11,
      color: colors.subtle,
      marginLeft: 6,
    },
    sessionPhone: {
      fontSize: 11.5,
      color: colors.muted,
      marginTop: 2,
    },
    sessionBottomRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginTop: 4,
      gap: 8,
    },
    sessionSnippet: {
      fontSize: 12.5,
      color: colors.muted,
      flex: 1,
    },
    sessionSnippetBold: {
      color: colors.text,
      fontWeight: "600",
    },
    badgesRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    aiActiveTag: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: "rgba(22, 140, 245, 0.1)",
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 6,
      gap: 3,
    },
    aiActiveTagText: {
      fontSize: 10,
      fontWeight: "700",
      color: colors.accent,
    },
    aiPausedTag: {
      backgroundColor: "#fef3c7",
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 6,
    },
    aiPausedTagText: {
      fontSize: 10,
      fontWeight: "700",
      color: "#d97706",
    },
    unreadCountBadge: {
      backgroundColor: colors.accent,
      minWidth: 18,
      height: 18,
      borderRadius: 9,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 4,
    },
    unreadCountText: {
      color: "#ffffff",
      fontSize: 10,
      fontWeight: "750",
    },
    loadingArea: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      padding: 30,
      gap: 8,
    },
    loadingText: {
      fontSize: 13,
      color: colors.muted,
    },
    emptyContainer: {
      alignItems: "center",
      justifyContent: "center",
      padding: 40,
      marginTop: 40,
    },
    emptyTitle: {
      fontSize: 16,
      fontWeight: "700",
      color: colors.text,
      marginTop: 12,
    },
    emptySubtitle: {
      fontSize: 13,
      color: colors.muted,
      textAlign: "center",
      marginTop: 6,
      lineHeight: 18,
    },

    // Conversation view styles
    chatHeader: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 12,
      paddingVertical: 10,
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      gap: 10,
    },
    backButton: {
      padding: 6,
    },
    chatHeaderAvatar: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: colors.accent,
      alignItems: "center",
      justifyContent: "center",
    },
    chatHeaderInfo: {
      flex: 1,
    },
    chatHeaderName: {
      fontSize: 14,
      fontWeight: "700",
      color: colors.text,
    },
    chatHeaderPhone: {
      fontSize: 11.5,
      color: colors.muted,
      marginTop: 1,
    },
    chatHeaderActions: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    headerIconBtn: {
      width: 34,
      height: 34,
      borderRadius: 8,
      backgroundColor: colors.background,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: colors.border,
    },
    aiBanner: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    aiBannerActive: {
      backgroundColor: "rgba(22, 140, 245, 0.07)",
    },
    aiBannerPaused: {
      backgroundColor: "#fef3c7",
    },
    aiBannerLeft: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      flex: 1,
    },
    aiBannerTitle: {
      fontSize: 12,
      fontWeight: "700",
      color: colors.text,
    },
    aiBannerSubtitle: {
      fontSize: 10.5,
      color: colors.muted,
      marginTop: 1,
    },
    messagesList: {
      paddingHorizontal: 14,
      paddingVertical: 12,
      gap: 10,
    },
    messageRow: {
      flexDirection: "row",
      marginBottom: 4,
    },
    messageRowSeller: {
      justifyContent: "flex-end",
    },
    messageRowAssistant: {
      justifyContent: "flex-start",
    },
    messageRowCustomer: {
      justifyContent: "flex-start",
    },
    messageBubble: {
      maxWidth: "80%",
      borderRadius: 16,
      paddingHorizontal: 13,
      paddingVertical: 9,
    },
    bubbleSeller: {
      backgroundColor: colors.accent,
      borderBottomRightRadius: 4,
    },
    bubbleAssistant: {
      backgroundColor: "#6366f1",
      borderBottomLeftRadius: 4,
    },
    bubbleCustomer: {
      backgroundColor: colors.surface,
      borderBottomLeftRadius: 4,
      borderWidth: 1,
      borderColor: colors.border,
    },
    senderBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      marginBottom: 3,
    },
    senderBadgeText: {
      fontSize: 10,
      fontWeight: "750",
      color: "#ffffff",
      textTransform: "uppercase",
      letterSpacing: 0.4,
    },
    senderBadgeSeller: {
      marginBottom: 2,
    },
    senderBadgeSellerText: {
      fontSize: 9.5,
      fontWeight: "700",
      color: "rgba(255,255,255,0.8)",
      textTransform: "uppercase",
    },
    messageText: {
      fontSize: 13.5,
      lineHeight: 18,
    },
    textSeller: {
      color: "#ffffff",
    },
    textAssistant: {
      color: "#ffffff",
    },
    textCustomer: {
      color: colors.text,
    },
    translationBox: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      marginTop: 4,
      paddingTop: 4,
      borderTopWidth: 0.5,
      borderTopColor: "rgba(255,255,255,0.3)",
    },
    translationText: {
      fontSize: 11,
      color: "rgba(255,255,255,0.9)",
      fontStyle: "italic",
    },
    bubbleFooter: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "flex-end",
      marginTop: 3,
    },
    bubbleTime: {
      fontSize: 9.5,
    },
    timeDark: {
      color: "rgba(255,255,255,0.75)",
    },
    timeLight: {
      color: colors.subtle,
    },
    composer: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 12,
      paddingTop: 8,
      paddingBottom: Math.max(bottomInset, 8),
      backgroundColor: colors.surface,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      gap: 8,
    },
    composerInput: {
      flex: 1,
      backgroundColor: colors.background,
      borderRadius: 20,
      paddingHorizontal: 14,
      paddingVertical: 8,
      fontSize: 13.5,
      color: colors.text,
      maxHeight: 100,
      borderWidth: 1,
      borderColor: colors.border,
    },
    sendButton: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: colors.accent,
      alignItems: "center",
      justifyContent: "center",
    },
    sendButtonDisabled: {
      opacity: 0.5,
    },
  });
}
