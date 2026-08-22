import { router } from "expo-router";
import { CheckCheck, X } from "lucide-react-native";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  formatRelativeTime,
  getNotificationTarget,
  getNotificationType,
} from "../constants/notificationTypes";
import { getToneColors } from "../constants/tones";
import { useAuth } from "../context/authContextValue";
import { useAppTheme } from "../context/ThemeContext";
import {
  getNotifications,
  markNotificationRead,
} from "../services/notificationService";

function NotificationRow({ notification, onPress, colors, theme, styles }) {
  const typeInfo = getNotificationType(notification.type);
  const toneColors = getToneColors(typeInfo.tone, theme);
  const Icon = typeInfo.icon;
  const isUnread = !notification.isRead;

  return (
    <TouchableOpacity
      style={[styles.row, isUnread && styles.rowUnread]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.rowIcon, { backgroundColor: toneColors.background }]}>
        <Icon size={19} color={toneColors.icon} />
      </View>

      <View style={styles.rowBody}>
        <View style={styles.rowTopLine}>
          <Text style={[styles.rowLabel, { color: toneColors.icon }]}>
            {typeInfo.label}
          </Text>
          <Text style={styles.rowTime}>
            {formatRelativeTime(notification.createdAt)}
          </Text>
        </View>

        <Text style={styles.rowTitle} numberOfLines={2}>
          {notification.title}
        </Text>

        {notification.message ? (
          <Text style={styles.rowMessage} numberOfLines={3}>
            {notification.message}
          </Text>
        ) : null}

        {notification.orderNumber ? (
          <View style={styles.rowTag}>
            <Text style={styles.rowTagText}>#{notification.orderNumber}</Text>
          </View>
        ) : null}
      </View>

      {isUnread && <View style={styles.unreadDot} />}
    </TouchableOpacity>
  );
}

export default function NotificationsPanel({ visible, onClose, onUnreadChange }) {
  const { colors, theme } = useAppTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(
    () => createStyles(colors, insets.top, insets.bottom),
    [colors, insets.top, insets.bottom],
  );
  const { business } = useAuth();

  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const [isMarkingAll, setIsMarkingAll] = useState(false);

  const unreadCount = notifications.filter((item) => !item.isRead).length;

  const loadNotifications = useCallback(async () => {
    if (!business?.id) {
      setIsLoading(false);
      return;
    }

    try {
      // Always load the full list so the All/Unread toggle can filter locally
      // without a second round trip.
      const items = (await getNotifications(business.id, false)) ?? [];
      setNotifications(items);
      onUnreadChange?.(items.filter((item) => !item.isRead).length);
    } catch {
      // Keep whatever is already on screen.
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [business?.id, onUnreadChange]);

  useEffect(() => {
    if (visible) {
      setIsLoading(true);
      loadNotifications();
    }
  }, [visible, loadNotifications]);

  async function handlePress(notification) {
    if (!notification.isRead) {
      setNotifications((current) =>
        current.map((item) =>
          item.id === notification.id ? { ...item, isRead: true } : item,
        ),
      );
      onUnreadChange?.(Math.max(0, unreadCount - 1));

      markNotificationRead(business.id, notification.id).catch(() => {
        // Worst case it stays unread on the next refresh.
      });
    }

    const target = getNotificationTarget(notification);
    onClose();

    if (target) router.push(target);
  }

  async function handleMarkAllRead() {
    const unread = notifications.filter((item) => !item.isRead);
    if (unread.length === 0) return;

    setIsMarkingAll(true);
    setNotifications((current) =>
      current.map((item) => ({ ...item, isRead: true })),
    );
    onUnreadChange?.(0);

    try {
      // There is no bulk endpoint, so mark each one individually.
      await Promise.all(
        unread.map((item) =>
          markNotificationRead(business.id, item.id).catch(() => null),
        ),
      );
    } finally {
      setIsMarkingAll(false);
    }
  }

  const visibleNotifications = showUnreadOnly
    ? notifications.filter((item) => !item.isRead)
    : notifications;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.screen}>
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>Notifications</Text>
            <Text style={styles.headerSubtitle}>
              {unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}
            </Text>
          </View>

          <TouchableOpacity onPress={onClose} hitSlop={10} style={styles.closeButton}>
            <X size={22} color={colors.text} />
          </TouchableOpacity>
        </View>

        <View style={styles.toolbar}>
          <View style={styles.tabs}>
            <TouchableOpacity
              style={[styles.tab, !showUnreadOnly && styles.tabActive]}
              onPress={() => setShowUnreadOnly(false)}
            >
              <Text
                style={[styles.tabText, !showUnreadOnly && styles.tabTextActive]}
              >
                All
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tab, showUnreadOnly && styles.tabActive]}
              onPress={() => setShowUnreadOnly(true)}
            >
              <Text
                style={[styles.tabText, showUnreadOnly && styles.tabTextActive]}
              >
                Unread{unreadCount > 0 ? ` (${unreadCount})` : ""}
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.markAllButton}
            onPress={handleMarkAllRead}
            disabled={unreadCount === 0 || isMarkingAll}
          >
            <CheckCheck
              size={15}
              color={unreadCount === 0 ? colors.subtle : colors.accent}
            />
            <Text
              style={[
                styles.markAllText,
                unreadCount === 0 && styles.markAllTextDisabled,
              ]}
            >
              Mark all
            </Text>
          </TouchableOpacity>
        </View>

        {isLoading ? (
          <ActivityIndicator
            size="large"
            color={colors.accent}
            style={styles.loader}
          />
        ) : (
          <FlatList
            data={visibleNotifications}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={() => {
                  setIsRefreshing(true);
                  loadNotifications();
                }}
              />
            }
            ListEmptyComponent={
              <View style={styles.empty}>
                <Text style={styles.emptyTitle}>
                  {showUnreadOnly ? "Nothing unread" : "No notifications yet"}
                </Text>
                <Text style={styles.emptyText}>
                  {showUnreadOnly
                    ? "You have read everything here."
                    : "New orders, fraud warnings and customer messages will appear here."}
                </Text>
              </View>
            }
            renderItem={({ item }) => (
              <NotificationRow
                notification={item}
                onPress={() => handlePress(item)}
                colors={colors}
                theme={theme}
                styles={styles}
              />
            )}
          />
        )}
      </View>
    </Modal>
  );
}

function createStyles(colors, topInset, bottomInset) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.background,
      paddingTop: topInset,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      paddingVertical: 14,
    },
    headerText: {
      flex: 1,
    },
    headerTitle: {
      color: colors.textStrong,
      fontSize: 22,
      fontWeight: "700",
    },
    headerSubtitle: {
      color: colors.muted,
      fontSize: 13,
      marginTop: 2,
    },
    closeButton: {
      width: 34,
      height: 34,
      alignItems: "center",
      justifyContent: "center",
    },
    toolbar: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      paddingBottom: 12,
      gap: 12,
    },
    tabs: {
      flexDirection: "row",
      backgroundColor: colors.surfaceSoft,
      borderRadius: 9,
      padding: 3,
      flex: 1,
    },
    tab: {
      flex: 1,
      paddingVertical: 8,
      borderRadius: 7,
      alignItems: "center",
    },
    tabActive: {
      backgroundColor: colors.surface,
    },
    tabText: {
      color: colors.muted,
      fontSize: 13,
      fontWeight: "600",
    },
    tabTextActive: {
      color: colors.textStrong,
    },
    markAllButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
    },
    markAllText: {
      color: colors.accent,
      fontSize: 13,
      fontWeight: "600",
    },
    markAllTextDisabled: {
      color: colors.subtle,
    },
    loader: {
      marginTop: 40,
    },
    listContent: {
      paddingHorizontal: 16,
      paddingBottom: 24 + bottomInset,
    },
    row: {
      flexDirection: "row",
      gap: 12,
      padding: 13,
      borderRadius: 12,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 10,
      alignItems: "flex-start",
    },
    rowUnread: {
      borderColor: colors.accent,
    },
    rowIcon: {
      width: 40,
      height: 40,
      borderRadius: 11,
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
    },
    rowBody: {
      flex: 1,
      gap: 3,
    },
    rowTopLine: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 8,
    },
    rowLabel: {
      fontSize: 11,
      fontWeight: "700",
      textTransform: "uppercase",
      letterSpacing: 0.4,
    },
    rowTime: {
      color: colors.subtle,
      fontSize: 11,
    },
    rowTitle: {
      color: colors.textStrong,
      fontSize: 14,
      fontWeight: "600",
    },
    rowMessage: {
      color: colors.muted,
      fontSize: 13,
      lineHeight: 18,
    },
    rowTag: {
      alignSelf: "flex-start",
      backgroundColor: colors.surfaceSoft,
      borderRadius: 6,
      paddingHorizontal: 8,
      paddingVertical: 3,
      marginTop: 4,
    },
    rowTagText: {
      color: colors.text,
      fontSize: 11,
      fontWeight: "700",
    },
    unreadDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.accent,
      marginTop: 6,
    },
    empty: {
      alignItems: "center",
      paddingHorizontal: 32,
      marginTop: 60,
    },
    emptyTitle: {
      color: colors.textStrong,
      fontSize: 16,
      fontWeight: "700",
      marginBottom: 6,
    },
    emptyText: {
      color: colors.muted,
      fontSize: 13,
      textAlign: "center",
      lineHeight: 19,
    },
  });
}
