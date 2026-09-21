import {
  Bell,
  Check,
  CreditCard,
  Globe,
  LogOut,
  Moon,
  Palette,
  Shield,
  Sparkles,
  Store,
  Sun,
  Users,
  X,
} from "lucide-react-native";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
import { router } from "expo-router";

import { useAuth } from "@/context/authContextValue";
import { useAppTheme } from "@/context/ThemeContext";
import { updateBusiness } from "@/services/businessService";
import { logoutUser } from "@/services/authService";
import StaffSettingsModal from "./StaffSettingsModal";
import StorefrontInstructionsModal from "./StorefrontInstructionsModal";

const SECTIONS = [
  { id: "general", label: "General", icon: Store },
  { id: "staff", label: "Staff", icon: Users },
  { id: "appearance", label: "Theme", icon: Palette },
  { id: "plan", label: "Plan", icon: CreditCard },
];

export default function SettingsModal({
  visible,
  onClose,
  initialSection = "general",
}) {
  const { colors, theme, toggleTheme } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { business, sellerProfile, refreshBusiness } = useAuth();

  const [activeSection, setActiveSection] = useState(initialSection);
  const [businessName, setBusinessName] = useState(business?.name || "");
  const [phone, setPhone] = useState(business?.phone || "");
  const [email, setEmail] = useState(business?.email || "");
  const [currency, setCurrency] = useState(business?.currency || "LKR");
  const [isSaving, setIsSaving] = useState(false);

  const [isStaffOpen, setIsStaffOpen] = useState(false);
  const [isStorefrontOpen, setIsStorefrontOpen] = useState(false);

  if (!visible) return null;

  async function handleSaveGeneral() {
    if (!business?.id) return;
    if (!businessName.trim()) {
      Alert.alert("Error", "Business name cannot be empty.");
      return;
    }

    setIsSaving(true);
    try {
      await updateBusiness(business.id, {
        name: businessName.trim(),
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        currency: currency.trim() || "LKR",
      });
      refreshBusiness?.();
      Alert.alert("Success", "Business settings updated.");
    } catch (err) {
      Alert.alert("Error", err.message || "Failed to save settings.");
    } finally {
      setIsSaving(false);
    }
  }

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
    <>
      <Modal
        visible={visible}
        animationType="slide"
        transparent
        onRequestClose={onClose}
      >
        <Pressable style={styles.backdrop} onPress={onClose}>
          <Pressable style={styles.sheet} onPress={() => {}}>
            <View style={styles.header}>
              <Text style={styles.headerTitle}>Store Settings</Text>
              <TouchableOpacity onPress={onClose} hitSlop={8}>
                <X size={20} color={colors.muted} />
              </TouchableOpacity>
            </View>

            {/* Section tabs */}
            <View style={styles.tabsRow}>
              {SECTIONS.map((section) => {
                const Icon = section.icon;
                const isActive = activeSection === section.id;
                return (
                  <TouchableOpacity
                    key={section.id}
                    style={[styles.tab, isActive && styles.tabActive]}
                    onPress={() => setActiveSection(section.id)}
                  >
                    <Icon
                      size={15}
                      color={isActive ? colors.accent : colors.muted}
                    />
                    <Text
                      style={[
                        styles.tabText,
                        isActive && styles.tabTextActive,
                      ]}
                    >
                      {section.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <ScrollView contentContainerStyle={styles.content}>
              {/* --- GENERAL SECTION --- */}
              {activeSection === "general" && (
                <View style={styles.sectionStack}>
                  <Text style={styles.sectionHeading}>Business Profile</Text>

                  <View style={styles.field}>
                    <Text style={styles.label}>Business Name *</Text>
                    <TextInput
                      style={styles.input}
                      value={businessName}
                      onChangeText={setBusinessName}
                      placeholder="Your Store Name"
                      placeholderTextColor={colors.subtle}
                    />
                  </View>

                  <View style={styles.field}>
                    <Text style={styles.label}>Support Phone</Text>
                    <TextInput
                      style={styles.input}
                      value={phone}
                      onChangeText={setPhone}
                      placeholder="+94 77 123 4567"
                      placeholderTextColor={colors.subtle}
                      keyboardType="phone-pad"
                    />
                  </View>

                  <View style={styles.field}>
                    <Text style={styles.label}>Store Email</Text>
                    <TextInput
                      style={styles.input}
                      value={email}
                      onChangeText={setEmail}
                      placeholder="store@example.com"
                      placeholderTextColor={colors.subtle}
                      keyboardType="email-address"
                      autoCapitalize="none"
                    />
                  </View>

                  <View style={styles.field}>
                    <Text style={styles.label}>Store Currency</Text>
                    <TextInput
                      style={styles.input}
                      value={currency}
                      onChangeText={setCurrency}
                      placeholder="LKR"
                      placeholderTextColor={colors.subtle}
                      autoCapitalize="characters"
                    />
                  </View>

                  <TouchableOpacity
                    style={styles.storefrontBtn}
                    onPress={() => setIsStorefrontOpen(true)}
                  >
                    <Globe size={18} color={colors.accent} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.storefrontBtnTitle}>
                        Storefront & Chatbot Link
                      </Text>
                      <Text style={styles.storefrontBtnSub}>
                        View and share your direct online catalog link
                      </Text>
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.saveBtn}
                    onPress={handleSaveGeneral}
                    disabled={isSaving}
                  >
                    {isSaving ? (
                      <ActivityIndicator size="small" color="#ffffff" />
                    ) : (
                      <Text style={styles.saveBtnText}>Save Changes</Text>
                    )}
                  </TouchableOpacity>
                </View>
              )}

              {/* --- STAFF SECTION --- */}
              {activeSection === "staff" && (
                <View style={styles.sectionStack}>
                  <Text style={styles.sectionHeading}>Team Access & Permissions</Text>
                  <Text style={styles.sectionDescription}>
                    Invite managers and team members to manage your orders, products, and courier dispatches.
                  </Text>

                  <TouchableOpacity
                    style={styles.actionCard}
                    onPress={() => setIsStaffOpen(true)}
                  >
                    <Users size={20} color={colors.accent} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.actionCardTitle}>Manage Team Members</Text>
                      <Text style={styles.actionCardSub}>
                        View active members, invite staff, assign roles
                      </Text>
                    </View>
                  </TouchableOpacity>
                </View>
              )}

              {/* --- APPEARANCE SECTION --- */}
              {activeSection === "appearance" && (
                <View style={styles.sectionStack}>
                  <Text style={styles.sectionHeading}>Appearance & Theme</Text>
                  <Text style={styles.sectionDescription}>
                    Select your preferred mobile display theme.
                  </Text>

                  <View style={styles.themeGrid}>
                    <TouchableOpacity
                      style={[
                        styles.themeOption,
                        theme === "light" && styles.themeOptionActive,
                      ]}
                      onPress={() => theme !== "light" && toggleTheme()}
                    >
                      <Sun
                        size={24}
                        color={theme === "light" ? colors.accent : colors.muted}
                      />
                      <Text
                        style={[
                          styles.themeOptionText,
                          theme === "light" && styles.themeOptionTextActive,
                        ]}
                      >
                        Light Mode
                      </Text>
                      {theme === "light" && (
                        <Check size={16} color={colors.accent} />
                      )}
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.themeOption,
                        theme === "dark" && styles.themeOptionActive,
                      ]}
                      onPress={() => theme !== "dark" && toggleTheme()}
                    >
                      <Moon
                        size={24}
                        color={theme === "dark" ? colors.accent : colors.muted}
                      />
                      <Text
                        style={[
                          styles.themeOptionText,
                          theme === "dark" && styles.themeOptionTextActive,
                        ]}
                      >
                        Dark Mode
                      </Text>
                      {theme === "dark" && (
                        <Check size={16} color={colors.accent} />
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* --- PLAN SECTION --- */}
              {activeSection === "plan" && (
                <View style={styles.sectionStack}>
                  <Text style={styles.sectionHeading}>Subscription Plan</Text>

                  <View style={styles.planCard}>
                    <View style={styles.planHeader}>
                      <Text style={styles.planName}>Vendly Business</Text>
                      <View style={styles.activeTag}>
                        <Text style={styles.activeTagText}>ACTIVE</Text>
                      </View>
                    </View>
                    <Text style={styles.planDetails}>
                      Unlimited orders, automated courier integration, smart inventory tracking, WhatsApp templates, and AI Business Assistant.
                    </Text>
                  </View>
                </View>
              )}

              <TouchableOpacity
                style={styles.logoutButton}
                onPress={handleLogout}
              >
                <LogOut size={16} color={colors.danger} />
                <Text style={styles.logoutText}>Log Out of Vendly</Text>
              </TouchableOpacity>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      <StaffSettingsModal
        visible={isStaffOpen}
        onClose={() => setIsStaffOpen(false)}
        businessId={business?.id}
        currentRole={sellerProfile?.role}
      />

      <StorefrontInstructionsModal
        visible={isStorefrontOpen}
        onClose={() => setIsStorefrontOpen(false)}
        business={business}
      />
    </>
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
    headerTitle: {
      fontSize: 17,
      fontWeight: "700",
      color: colors.textStrong,
    },
    tabsRow: {
      flexDirection: "row",
      paddingHorizontal: 16,
      paddingVertical: 10,
      gap: 8,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    tab: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingVertical: 7,
      paddingHorizontal: 12,
      borderRadius: 999,
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
    },
    tabActive: {
      borderColor: colors.accent,
      backgroundColor: colors.surfaceSoft,
    },
    tabText: {
      fontSize: 12,
      fontWeight: "600",
      color: colors.muted,
    },
    tabTextActive: {
      color: colors.accent,
      fontWeight: "700",
    },
    content: {
      padding: 18,
    },
    sectionStack: {
      gap: 14,
    },
    sectionHeading: {
      fontSize: 15,
      fontWeight: "700",
      color: colors.textStrong,
    },
    sectionDescription: {
      fontSize: 13,
      color: colors.muted,
      lineHeight: 18,
    },
    field: {
      gap: 6,
    },
    label: {
      fontSize: 12,
      fontWeight: "600",
      color: colors.textStrong,
    },
    input: {
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 14,
      color: colors.textStrong,
    },
    storefrontBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      padding: 12,
      backgroundColor: colors.surfaceSoft,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      marginTop: 4,
    },
    storefrontBtnTitle: {
      fontSize: 13,
      fontWeight: "700",
      color: colors.textStrong,
    },
    storefrontBtnSub: {
      fontSize: 11,
      color: colors.muted,
      marginTop: 2,
    },
    saveBtn: {
      backgroundColor: colors.accent,
      paddingVertical: 12,
      borderRadius: 10,
      alignItems: "center",
      marginTop: 8,
    },
    saveBtnText: {
      color: "#ffffff",
      fontSize: 14,
      fontWeight: "700",
    },
    actionCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: 14,
      padding: 16,
      backgroundColor: colors.background,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    actionCardTitle: {
      fontSize: 14,
      fontWeight: "700",
      color: colors.textStrong,
    },
    actionCardSub: {
      fontSize: 12,
      color: colors.muted,
      marginTop: 2,
    },
    themeGrid: {
      gap: 10,
    },
    themeOption: {
      flexDirection: "row",
      alignItems: "center",
      gap: 14,
      padding: 14,
      backgroundColor: colors.background,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    themeOptionActive: {
      borderColor: colors.accent,
      backgroundColor: colors.surfaceSoft,
    },
    themeOptionText: {
      flex: 1,
      fontSize: 14,
      fontWeight: "600",
      color: colors.muted,
    },
    themeOptionTextActive: {
      color: colors.textStrong,
      fontWeight: "700",
    },
    planCard: {
      backgroundColor: colors.background,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 16,
      gap: 10,
    },
    planHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    planName: {
      fontSize: 16,
      fontWeight: "700",
      color: colors.textStrong,
    },
    activeTag: {
      backgroundColor: "#ecfdf5",
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 999,
    },
    activeTagText: {
      color: "#059669",
      fontSize: 10,
      fontWeight: "800",
    },
    planDetails: {
      fontSize: 12,
      lineHeight: 18,
      color: colors.muted,
    },
    logoutButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      backgroundColor: colors.dangerBackground,
      borderWidth: 1,
      borderColor: colors.dangerBorder,
      paddingVertical: 14,
      borderRadius: 12,
      marginTop: 20,
    },
    logoutText: {
      color: colors.danger,
      fontWeight: "700",
      fontSize: 14,
    },
  });
}
