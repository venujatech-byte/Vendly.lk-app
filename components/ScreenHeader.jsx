import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Bell, Moon, Settings, Sun } from "lucide-react-native";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { useAuth } from "../context/authContextValue";
import { useAppTheme } from "../context/ThemeContext";
import { logoutUser } from "../services/authService";
import {
  getNotifications,
  markNotificationRead,
} from "../services/notificationService";

function businessInitials(name = "") {
  const words = name.trim().split(/\s+/).filter(Boolean).slice(0, 2);
  return words.map((word) => word[0]?.toUpperCase() ?? "").join("") || "V";
}

export default function ScreenHeader({ title }) {
  const { colors, theme, toggleTheme } = useAppTheme();
  const { sellerProfile, business } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(false);

  const unreadCount = notifications.filter((item) => !item.readAt).length;

  useEffect(() => {
    if (!business?.id) return undefined;

    let isCurrent = true;

    async function loadUnread() {
      try {
        const items = await getNotifications(business.id, true);
        if (isCurrent) setNotifications(items ?? []);
      } catch {
        // Silently ignore — the badge just stays at its last known count.
      }
    }

    loadUnread();
    const interval = setInterval(loadUnread, 30000);

    return () => {
      isCurrent = false;
      clearInterval(interval);
    };
  }, [business?.id]);

  async function openNotifications() {
    setIsNotificationsOpen(true);

    if (!business?.id) return;

    setIsLoadingNotifications(true);
    try {
      const items = await getNotifications(business.id, true);
      setNotifications(items ?? []);
    } catch {
      // Keep whatever notifications were already loaded.
    } finally {
      setIsLoadingNotifications(false);
    }
  }

  async function handleNotificationPress(notification) {
    if (!business?.id) return;

    try {
      await markNotificationRead(business.id, notification.id);
      setNotifications((current) =>
        current.filter((item) => item.id !== notification.id),
      );
    } catch {
      // Ignore — worst case the notification stays unread.
    }

    setIsNotificationsOpen(false);

    if (notification.type === "order" || notification.type === "fraud") {
      router.push("/(tabs)/orders");
    }
  }

  function openAvatarMenu() {
    Alert.alert(
      sellerProfile?.businessName ?? "Vendly",
      sellerProfile?.ownerName ?? "",
      [
        { text: "Log out", style: "destructive", onPress: () => logoutUser() },
        { text: "Cancel", style: "cancel" },
      ],
    );
  }

  const styles = createStyles(colors);

  return (
    <View style={styles.header}>
      <Text style={styles.title} numberOfLines={1}>
        {title}
      </Text>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.iconButton} onPress={toggleTheme}>
          {theme === "dark" ? (
            <Sun size={20} color={colors.text} />
          ) : (
            <Moon size={20} color={colors.text} />
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.iconButton}
          onPress={() =>
            Alert.alert("Settings", "Staff settings are coming soon to the mobile app.")
          }
        >
          <Settings size={20} color={colors.text} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.iconButton} onPress={openNotifications}>
          <Bell size={20} color={colors.text} />
          {unreadCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {unreadCount > 99 ? "99+" : unreadCount}
              </Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={openAvatarMenu}>
          <LinearGradient
            colors={["#0d5fa9", "#073665"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.avatar}
          >
            <Text style={styles.avatarText}>
              {businessInitials(sellerProfile?.businessName)}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      <Modal
        visible={isNotificationsOpen}
        animationType="fade"
        transparent
        onRequestClose={() => setIsNotificationsOpen(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setIsNotificationsOpen(false)}
        >
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <Text style={styles.modalTitle}>Notifications</Text>

            {isLoadingNotifications ? (
              <ActivityIndicator color={colors.accent} style={{ marginVertical: 16 }} />
            ) : (
              <FlatList
                data={notifications}
                keyExtractor={(item) => item.id}
                style={{ maxHeight: 360 }}
                ListEmptyComponent={
                  <Text style={styles.emptyText}>No unread notifications.</Text>
                }
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.notificationRow}
                    onPress={() => handleNotificationPress(item)}
                  >
                    <Text style={styles.notificationTitle}>{item.title}</Text>
                    {item.body ? (
                      <Text style={styles.notificationBody} numberOfLines={2}>
                        {item.body}
                      </Text>
                    ) : null}
                  </TouchableOpacity>
                )}
              />
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function createStyles(colors) {
  return StyleSheet.create({
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 12,
      minHeight: 56,
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    title: {
      color: colors.textStrong,
      fontSize: 20,
      fontWeight: "700",
      flexShrink: 1,
    },
    actions: {
      flexDirection: "row",
      alignItems: "center",
      gap: 2,
    },
    iconButton: {
      width: 34,
      height: 34,
      borderRadius: 17,
      alignItems: "center",
      justifyContent: "center",
    },
    badge: {
      position: "absolute",
      top: 2,
      right: 2,
      minWidth: 16,
      height: 16,
      borderRadius: 8,
      paddingHorizontal: 3,
      backgroundColor: colors.danger,
      alignItems: "center",
      justifyContent: "center",
    },
    badgeText: {
      color: "#ffffff",
      fontSize: 9,
      fontWeight: "700",
    },
    avatar: {
      width: 34,
      height: 34,
      borderRadius: 17,
      alignItems: "center",
      justifyContent: "center",
      marginLeft: 4,
    },
    avatarText: {
      color: "#ffffff",
      fontWeight: "700",
      fontSize: 13,
    },
    modalBackdrop: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.4)",
      justifyContent: "flex-start",
      alignItems: "flex-end",
      paddingTop: 60,
      paddingRight: 16,
    },
    modalCard: {
      width: 280,
      backgroundColor: colors.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 14,
    },
    modalTitle: {
      color: colors.textStrong,
      fontWeight: "700",
      fontSize: 15,
      marginBottom: 8,
    },
    emptyText: {
      color: colors.muted,
      fontSize: 13,
      paddingVertical: 12,
    },
    notificationRow: {
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    notificationTitle: {
      color: colors.text,
      fontWeight: "600",
      fontSize: 13,
    },
    notificationBody: {
      color: colors.muted,
      fontSize: 12,
      marginTop: 2,
    },
  });
}
