import { LinearGradient } from "expo-linear-gradient";
import { Bell, Moon, Search, Settings, Sun } from "lucide-react-native";
import { useEffect, useState } from "react";
import {
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "../context/authContextValue";
import { useAppTheme } from "../context/ThemeContext";
import { logoutUser } from "../services/authService";
import {
  configureDeviceNotifications,
  markNotificationsAsSeen,
  notifyNewNotifications,
} from "../services/deviceNotificationService";
import { getNotifications } from "../services/notificationService";
import GlobalSearchModal from "./GlobalSearchModal";
import NotificationsPanel from "./NotificationsPanel";

function businessInitials(name = "") {
  const words = name.trim().split(/\s+/).filter(Boolean).slice(0, 2);
  return words.map((word) => word[0]?.toUpperCase() ?? "").join("") || "V";
}

export default function ScreenHeader({ title }) {
  const { colors, theme, toggleTheme } = useAppTheme();
  const { sellerProfile, business } = useAuth();
  const insets = useSafeAreaInsets();
  const [unreadCount, setUnreadCount] = useState(0);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  useEffect(() => {
    if (!business?.id) return undefined;

    let isCurrent = true;
    let isFirstLoad = true;

    configureDeviceNotifications();

    async function loadUnread() {
      try {
        const items = (await getNotifications(business.id, true)) ?? [];

        if (!isCurrent) return;

        setUnreadCount(items.length);

        if (isFirstLoad) {
          // Don't fire a burst of alerts for a backlog the seller may have
          // already seen on the web dashboard.
          markNotificationsAsSeen(items);
          isFirstLoad = false;
          return;
        }

        notifyNewNotifications(items);
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

  const styles = createStyles(colors, insets.top);

  return (
    <View style={styles.header}>
      <Text style={styles.title} numberOfLines={1}>
        {title}
      </Text>

      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.iconButton}
          onPress={() => setIsSearchOpen(true)}
        >
          <Search size={20} color={colors.text} />
        </TouchableOpacity>

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

        <TouchableOpacity
          style={styles.iconButton}
          onPress={() => setIsNotificationsOpen(true)}
        >
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

      <NotificationsPanel
        visible={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
        onUnreadChange={setUnreadCount}
      />

      <GlobalSearchModal
        visible={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
      />
    </View>
  );
}

function createStyles(colors, topInset) {
  return StyleSheet.create({
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 12,
      paddingTop: topInset,
      minHeight: 56 + topInset,
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
  });
}
