import {
  CreditCard,
  Globe,
  LogOut,
  Mail,
  Phone,
  Settings,
  Shield,
  Store,
  User,
  X,
} from "lucide-react-native";
import React from "react";
import {
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";

import { useAuth } from "@/context/authContextValue";
import { useAppTheme } from "@/context/ThemeContext";
import { logoutUser } from "@/services/authService";

export default function ProfileModal({
  visible,
  onClose,
  onOpenSettings,
  onOpenStorefront,
}) {
  const { colors, theme } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { user, sellerProfile, business } = useAuth();

  if (!visible) return null;

  const displayName =
    sellerProfile?.ownerName ||
    sellerProfile?.businessName ||
    user?.displayName ||
    "Store Owner";
  const businessName =
    sellerProfile?.businessName || business?.name || "Vendly Store";
  const email = user?.email || sellerProfile?.email || "—";
  const phone = sellerProfile?.phone || business?.phone || "—";
  const role = sellerProfile?.role || "Owner";

  async function performLogout() {
    try {
      onClose();
      await logoutUser();
    } catch (err) {
      console.error("Logout error:", err);
    } finally {
      router.replace("/login");
    }
  }

  function handleLogout() {
    if (Platform.OS === "web") {
      if (typeof window !== "undefined" && typeof window.confirm === "function") {
        if (window.confirm("Are you sure you want to sign out of Vendly?")) {
          performLogout();
        }
      } else {
        performLogout();
      }
      return;
    }

    Alert.alert(
      "Log Out",
      "Are you sure you want to sign out of Vendly?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Log Out",
          style: "destructive",
          onPress: performLogout,
        },
      ],
    );
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
            <Text style={styles.headerTitle}>Account Profile</Text>
            <TouchableOpacity onPress={onClose} hitSlop={8}>
              <X size={20} color={colors.muted} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.content}>
            <View style={styles.profileHeader}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {displayName[0].toUpperCase()}
                </Text>
              </View>
              <View style={styles.profileDetails}>
                <Text style={styles.displayName}>{displayName}</Text>
                <Text style={styles.businessTitle}>{businessName}</Text>
                <View style={styles.rolePill}>
                  <Shield size={12} color={colors.accent} />
                  <Text style={styles.rolePillText}>{role.toUpperCase()}</Text>
                </View>
              </View>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Contact Details</Text>

              <View style={styles.infoRow}>
                <Mail size={16} color={colors.muted} />
                <View style={styles.infoTextWrap}>
                  <Text style={styles.infoLabel}>Email</Text>
                  <Text style={styles.infoValue}>{email}</Text>
                </View>
              </View>

              <View style={styles.infoRow}>
                <Phone size={16} color={colors.muted} />
                <View style={styles.infoTextWrap}>
                  <Text style={styles.infoLabel}>Phone</Text>
                  <Text style={styles.infoValue}>{phone}</Text>
                </View>
              </View>

              <View style={styles.infoRow}>
                <Store size={16} color={colors.muted} />
                <View style={styles.infoTextWrap}>
                  <Text style={styles.infoLabel}>Business Name</Text>
                  <Text style={styles.infoValue}>{businessName}</Text>
                </View>
              </View>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Quick Actions</Text>

              <TouchableOpacity
                style={styles.actionItem}
                onPress={() => {
                  onClose();
                  onOpenSettings?.("general");
                }}
              >
                <Settings size={18} color={colors.accent} />
                <Text style={styles.actionText}>Business Settings</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionItem}
                onPress={() => {
                  onClose();
                  onOpenStorefront?.();
                }}
              >
                <Globe size={18} color="#10b981" />
                <Text style={styles.actionText}>Online Storefront Link</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionItem}
                onPress={() => {
                  onClose();
                  onOpenSettings?.("staff");
                }}
              >
                <Shield size={18} color="#8b5cf6" />
                <Text style={styles.actionText}>Staff & Roles</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.logoutButton}
              onPress={handleLogout}
            >
              <LogOut size={16} color={colors.danger} />
              <Text style={styles.logoutText}>Log Out</Text>
            </TouchableOpacity>
          </ScrollView>
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
      maxHeight: "85%",
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
    headerTitle: {
      fontSize: 16,
      fontWeight: "700",
      color: colors.textStrong,
    },
    content: {
      padding: 18,
      gap: 16,
    },
    profileHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 16,
      padding: 16,
      backgroundColor: colors.background,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
    },
    avatar: {
      width: 54,
      height: 54,
      borderRadius: 27,
      backgroundColor: colors.accent,
      alignItems: "center",
      justifyContent: "center",
    },
    avatarText: {
      color: "#ffffff",
      fontSize: 22,
      fontWeight: "800",
    },
    profileDetails: {
      flex: 1,
      gap: 3,
    },
    displayName: {
      fontSize: 16,
      fontWeight: "700",
      color: colors.textStrong,
    },
    businessTitle: {
      fontSize: 12,
      color: colors.muted,
    },
    rolePill: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      alignSelf: "flex-start",
      backgroundColor: colors.surfaceSoft,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
      marginTop: 4,
      borderWidth: 1,
      borderColor: colors.border,
    },
    rolePillText: {
      fontSize: 10,
      fontWeight: "800",
      color: colors.accent,
    },
    card: {
      backgroundColor: colors.background,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 14,
      gap: 12,
    },
    cardTitle: {
      fontSize: 13,
      fontWeight: "700",
      color: colors.textStrong,
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    infoRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    infoTextWrap: {
      flex: 1,
    },
    infoLabel: {
      fontSize: 10,
      color: colors.subtle,
      fontWeight: "600",
    },
    infoValue: {
      fontSize: 13,
      fontWeight: "600",
      color: colors.textStrong,
    },
    actionItem: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    actionText: {
      fontSize: 13,
      fontWeight: "600",
      color: colors.textStrong,
    },
    logoutButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      backgroundColor: colors.dangerBackground,
      borderWidth: 1,
      borderColor: colors.dangerBorder,
      paddingVertical: 12,
      borderRadius: 12,
      marginTop: 4,
    },
    logoutText: {
      color: colors.danger,
      fontWeight: "700",
      fontSize: 14,
    },
  });
}
