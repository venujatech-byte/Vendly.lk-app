import {
  Copy,
  ExternalLink,
  Globe,
  Instagram,
  MessageCircle,
  Share2,
  X,
} from "lucide-react-native";
import React, { useState } from "react";
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAppTheme } from "@/context/ThemeContext";

export default function StorefrontInstructionsModal({
  visible,
  onClose,
  business,
}) {
  const { colors, theme } = useAppTheme();
  const insets = useSafeAreaInsets();
  const [copied, setCopied] = useState(false);

  if (!visible) return null;

  const shortCode = business?.shortCode || "store";
  const webAppUrl = (
    process.env.EXPO_PUBLIC_WEB_APP_URL ?? "https://vendly.lk"
  ).replace(/\/$/, "");
  const storefrontUrl = `${webAppUrl}/s/${shortCode}`;

  async function handleShare() {
    try {
      await Share.share({
        message: `Order from ${business?.name || "our store"} online: ${storefrontUrl}`,
        url: storefrontUrl,
      });
    } catch {
      // Ignored
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
        <Pressable style={styles.sheet} onPress={() => {}}>
          <View style={styles.header}>
            <View style={styles.headerTitleWrap}>
              <Globe size={20} color={colors.accent} />
              <Text style={styles.headerTitle}>Online Storefront & Chatbot</Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={8}>
              <X size={20} color={colors.muted} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.content}>
            <Text style={styles.description}>
              Share your direct shopping link with your customers on Instagram, WhatsApp, TikTok, or Facebook. Customers can browse your real-time catalog, place orders, and track fulfillment without app installs.
            </Text>

            <View style={styles.linkCard}>
              <Text style={styles.linkLabel}>YOUR STOREFRONT URL</Text>
              <Text style={styles.linkText} numberOfLines={1}>
                {storefrontUrl}
              </Text>

              <View style={styles.linkActions}>
                <TouchableOpacity
                  style={styles.shareButton}
                  onPress={handleShare}
                >
                  <Share2 size={16} color="#ffffff" />
                  <Text style={styles.shareButtonText}>Share Link</Text>
                </TouchableOpacity>
              </View>
            </View>

            <Text style={styles.sectionHeading}>How to use it</Text>

            <View style={styles.tipCard}>
              <View style={[styles.tipIcon, { backgroundColor: "#fdf2f8" }]}>
                <Instagram size={20} color="#e1306c" />
              </View>
              <View style={styles.tipBody}>
                <Text style={styles.tipTitle}>Instagram & TikTok Bio</Text>
                <Text style={styles.tipText}>
                  Put this link in your profile bio so followers can directly view your catalog and checkout in Sri Lankan Rupees.
                </Text>
              </View>
            </View>

            <View style={styles.tipCard}>
              <View style={[styles.tipIcon, { backgroundColor: "#f0fdf4" }]}>
                <MessageCircle size={20} color="#16a34a" />
              </View>
              <View style={styles.tipBody}>
                <Text style={styles.tipTitle}>WhatsApp Business Quick Reply</Text>
                <Text style={styles.tipText}>
                  Set up a WhatsApp auto-reply sending this link whenever new customers ask for product prices or available sizes.
                </Text>
              </View>
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Text style={styles.closeBtnText}>Done</Text>
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
      gap: 16,
    },
    description: {
      fontSize: 13,
      lineHeight: 19,
      color: colors.muted,
    },
    linkCard: {
      backgroundColor: colors.surfaceSoft,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      padding: 14,
      gap: 8,
    },
    linkLabel: {
      fontSize: 10,
      fontWeight: "800",
      color: colors.accent,
      letterSpacing: 0.8,
    },
    linkText: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.textStrong,
    },
    linkActions: {
      flexDirection: "row",
      gap: 10,
      marginTop: 6,
    },
    shareButton: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      backgroundColor: colors.accent,
      paddingVertical: 10,
      borderRadius: 8,
    },
    shareButtonText: {
      color: "#ffffff",
      fontWeight: "700",
      fontSize: 13,
    },
    sectionHeading: {
      fontSize: 14,
      fontWeight: "700",
      color: colors.textStrong,
      marginTop: 4,
    },
    tipCard: {
      flexDirection: "row",
      gap: 12,
      padding: 12,
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
    },
    tipIcon: {
      width: 38,
      height: 38,
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center",
    },
    tipBody: {
      flex: 1,
      gap: 2,
    },
    tipTitle: {
      fontSize: 13,
      fontWeight: "700",
      color: colors.textStrong,
    },
    tipText: {
      fontSize: 12,
      lineHeight: 17,
      color: colors.muted,
    },
    footer: {
      paddingHorizontal: 18,
      paddingTop: 10,
    },
    closeBtn: {
      backgroundColor: colors.surfaceSoft,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      paddingVertical: 12,
      alignItems: "center",
    },
    closeBtnText: {
      color: colors.textStrong,
      fontSize: 14,
      fontWeight: "700",
    },
  });
}
