import { LinearGradient } from "expo-linear-gradient";
import {
  Bell,
  Moon,
  Search,
  Settings,
  Sparkles,
  Sun,
} from "lucide-react-native";
import { useEffect, useState } from "react";
import {
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import BusinessAssistantModal from "./assistant/BusinessAssistantModal";
import GlobalSearchModal from "./GlobalSearchModal";
import NotificationsPanel from "./NotificationsPanel";
import ProfileModal from "./settings/ProfileModal";
import SettingsModal from "./settings/SettingsModal";
import StorefrontInstructionsModal from "./settings/StorefrontInstructionsModal";
import { useAuth } from "../context/authContextValue";
import { useAppTheme } from "../context/ThemeContext";
import {
  configureDeviceNotifications,
  markNotificationsAsSeen,
  notifyNewNotifications,
} from "../services/deviceNotificationService";
import { getNotifications } from "../services/notificationService";

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
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);
  const [isStorefrontOpen, setIsStorefrontOpen] = useState(false);

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
          markNotificationsAsSeen(items);
          isFirstLoad = false;
          return;
        }

        notifyNewNotifications(items);
      } catch {
        // Silently ignore
      }
    }

    loadUnread();
    const interval = setInterval(loadUnread, 30000);

    return () => {
      isCurrent = false;
      clearInterval(interval);
    };
  }, [business?.id]);

  const styles = createStyles(colors, insets.top);

  return (
    <View style={styles.header}>
      <Text style={styles.title} numberOfLines={1}>
        {title}
      </Text>

      <View style={styles.actions}>
        {/* AI Assistant Button */}
        <TouchableOpacity
          style={[styles.iconButton, styles.aiButton]}
          onPress={() => setIsAssistantOpen(true)}
        >
          <Sparkles size={18} color="#ffffff" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.iconButton}
          onPress={() => setIsSearchOpen(true)}
        >
          <Search size={19} color={colors.text} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.iconButton} onPress={toggleTheme}>
          {theme === "dark" ? (
            <Sun size={19} color={colors.text} />
          ) : (
            <Moon size={19} color={colors.text} />
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.iconButton}
          onPress={() => setIsSettingsOpen(true)}
        >
          <Settings size={19} color={colors.text} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.iconButton}
          onPress={() => setIsNotificationsOpen(true)}
        >
          <Bell size={19} color={colors.text} />
          {unreadCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {unreadCount > 99 ? "99+" : unreadCount}
              </Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => setIsProfileOpen(true)}>
          <LinearGradient
            colors={["#0d5fa9", "#073665"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.avatar}
          >
            <Text style={styles.avatarText}>
              {businessInitials(sellerProfile?.businessName || business?.name)}
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

      <SettingsModal
        visible={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />

      <ProfileModal
        visible={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        onOpenSettings={() => {
          setIsProfileOpen(false);
          setIsSettingsOpen(true);
        }}
        onOpenStorefront={() => {
          setIsProfileOpen(false);
          setIsStorefrontOpen(true);
        }}
      />

      <BusinessAssistantModal
        visible={isAssistantOpen}
        onClose={() => setIsAssistantOpen(false)}
      />

      <StorefrontInstructionsModal
        visible={isStorefrontOpen}
        onClose={() => setIsStorefrontOpen(false)}
        business={business}
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
    aiButton: {
      backgroundColor: colors.accent,
      marginRight: 2,
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
