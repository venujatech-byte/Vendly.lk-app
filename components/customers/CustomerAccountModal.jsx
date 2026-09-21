import { router } from "expo-router";
import {
  AlertTriangle,
  Banknote,
  Copy,
  Edit2,
  Mail,
  MapPin,
  MessageCircle,
  Package,
  Phone,
  RotateCcw,
  ShieldAlert,
  Trash2,
  Users,
  X,
} from "lucide-react-native";
import React from "react";
import {
  Alert,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAppTheme } from "@/context/ThemeContext";

function formatLkr(minorUnits = 0) {
  return `LKR ${(Number(minorUnits) / 100).toLocaleString("en-LK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default function CustomerAccountModal({
  visible,
  onClose,
  customer,
  onEdit,
  onDelete,
}) {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();

  if (!visible || !customer) return null;

  const phone = customer.normalizedPhone || customer.phoneNumber || "";
  const address = customer.defaultAddress || customer.address || {};
  const addressStr = [
    address.line1,
    address.line2,
    address.city,
    address.district,
    address.postalCode,
  ]
    .filter(Boolean)
    .join(", ");

  const orderCount = customer.orderCount || customer.completedOrderCount || 0;
  const totalSpentMinor = customer.totalSpentMinor || 0;
  const returnedCount = customer.returnedOrderCount || 0;
  const isHighRisk = customer.riskLevel === "high" || returnedCount >= 2;

  function handleCall() {
    if (!phone) return;
    Linking.openURL(`tel:${phone.replace(/[^\d+]/g, "")}`);
  }

  function handleWhatsApp() {
    if (!phone) return;
    const cleanPhone = phone.replace(/[^\d]/g, "");
    const formatted = cleanPhone.startsWith("0")
      ? `94${cleanPhone.slice(1)}`
      : cleanPhone;
    Linking.openURL(
      `https://wa.me/${formatted}?text=Hi%20${encodeURIComponent(
        customer.name || "",
      )},%20thank%20you%20for%20contacting%20us!`,
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
            <Text style={styles.headerTitle}>Customer Profile</Text>
            <TouchableOpacity onPress={onClose} hitSlop={8}>
              <X size={20} color={colors.muted} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.content}>
            <View style={styles.profileHeader}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {(customer.name || "C")[0].toUpperCase()}
                </Text>
              </View>
              <View style={styles.profileInfo}>
                <Text style={styles.customerName} numberOfLines={1}>
                  {customer.name}
                </Text>
                <Text style={styles.customerPhone}>{phone || "No phone"}</Text>
                {isHighRisk && (
                  <View style={styles.riskBadge}>
                    <ShieldAlert size={12} color={colors.danger} />
                    <Text style={styles.riskBadgeText}>
                      HIGH RETURN RISK ({returnedCount} returns)
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {/* Quick Action Buttons */}
            <View style={styles.actionsGrid}>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: "#10b981" }]}
                onPress={handleWhatsApp}
                disabled={!phone}
              >
                <MessageCircle size={18} color="#ffffff" />
                <Text style={styles.actionBtnText}>WhatsApp</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: colors.accent }]}
                onPress={handleCall}
                disabled={!phone}
              >
                <Phone size={18} color="#ffffff" />
                <Text style={styles.actionBtnText}>Call Customer</Text>
              </TouchableOpacity>
            </View>

            {/* Lifetime Metrics */}
            <View style={styles.statsRow}>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>LIFETIME SPEND</Text>
                <Text style={styles.statValue}>{formatLkr(totalSpentMinor)}</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>TOTAL ORDERS</Text>
                <Text style={styles.statValue}>{orderCount}</Text>
              </View>
            </View>

            {/* Contact Details Card */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Delivery Address</Text>
              <View style={styles.infoRow}>
                <MapPin size={16} color={colors.muted} />
                <Text style={styles.infoText}>
                  {addressStr || "No default address provided."}
                </Text>
              </View>

              {customer.email ? (
                <View style={styles.infoRow}>
                  <Mail size={16} color={colors.muted} />
                  <Text style={styles.infoText}>{customer.email}</Text>
                </View>
              ) : null}
            </View>

            {/* Edit / Manage */}
            <View style={styles.manageRow}>
              <TouchableOpacity
                style={styles.editBtn}
                onPress={() => {
                  onClose();
                  onEdit?.(customer);
                }}
              >
                <Edit2 size={16} color={colors.textStrong} />
                <Text style={styles.editBtnText}>Edit Details</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.deleteBtn}
                onPress={() => {
                  onClose();
                  onDelete?.(customer);
                }}
              >
                <Trash2 size={16} color={colors.danger} />
                <Text style={styles.deleteBtnText}>Delete</Text>
              </TouchableOpacity>
            </View>
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
      gap: 14,
      padding: 14,
      backgroundColor: colors.background,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
    },
    avatar: {
      width: 50,
      height: 50,
      borderRadius: 25,
      backgroundColor: colors.primary,
      alignItems: "center",
      justifyContent: "center",
    },
    avatarText: {
      color: "#ffffff",
      fontSize: 20,
      fontWeight: "700",
    },
    profileInfo: {
      flex: 1,
      gap: 2,
    },
    customerName: {
      fontSize: 16,
      fontWeight: "700",
      color: colors.textStrong,
    },
    customerPhone: {
      fontSize: 13,
      color: colors.muted,
    },
    riskBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      backgroundColor: colors.dangerBackground,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
      alignSelf: "flex-start",
      marginTop: 4,
      borderWidth: 1,
      borderColor: colors.dangerBorder,
    },
    riskBadgeText: {
      fontSize: 10,
      fontWeight: "700",
      color: colors.danger,
    },
    actionsGrid: {
      flexDirection: "row",
      gap: 10,
    },
    actionBtn: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      paddingVertical: 12,
      borderRadius: 10,
    },
    actionBtnText: {
      color: "#ffffff",
      fontSize: 13,
      fontWeight: "700",
    },
    statsRow: {
      flexDirection: "row",
      gap: 10,
    },
    statCard: {
      flex: 1,
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      padding: 12,
      gap: 4,
    },
    statLabel: {
      fontSize: 10,
      fontWeight: "800",
      color: colors.subtle,
      letterSpacing: 0.5,
    },
    statValue: {
      fontSize: 16,
      fontWeight: "700",
      color: colors.textStrong,
    },
    card: {
      backgroundColor: colors.background,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 14,
      gap: 10,
    },
    cardTitle: {
      fontSize: 12,
      fontWeight: "700",
      color: colors.textStrong,
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    infoRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 10,
    },
    infoText: {
      flex: 1,
      fontSize: 13,
      color: colors.textStrong,
      lineHeight: 18,
    },
    manageRow: {
      flexDirection: "row",
      gap: 10,
      marginTop: 4,
    },
    editBtn: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      paddingVertical: 12,
      borderRadius: 10,
      backgroundColor: colors.surfaceSoft,
      borderWidth: 1,
      borderColor: colors.border,
    },
    editBtnText: {
      fontSize: 13,
      fontWeight: "700",
      color: colors.textStrong,
    },
    deleteBtn: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      paddingVertical: 12,
      borderRadius: 10,
      backgroundColor: colors.dangerBackground,
      borderWidth: 1,
      borderColor: colors.dangerBorder,
    },
    deleteBtnText: {
      fontSize: 13,
      fontWeight: "700",
      color: colors.danger,
    },
  });
}
