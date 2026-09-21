import {
  Banknote,
  CheckCircle2,
  Clock3,
  DollarSign,
  Receipt,
  RotateCcw,
  Truck,
  X,
} from "lucide-react-native";
import React, { useMemo } from "react";
import {
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

export default function CodReconciliationModal({
  visible,
  onClose,
  orders = [],
  couriers = [],
}) {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();

  // Compute COD reconciliation stats
  const codStats = useMemo(() => {
    const codOrders = orders.filter((o) => o.paymentMethod === "cod");

    const deliveredCod = codOrders.filter((o) => o.status === "delivered");
    const inTransitCod = codOrders.filter((o) =>
      ["shipped", "packed"].includes(o.status),
    );
    const returnedCod = codOrders.filter((o) => o.status === "returned");

    const totalCollectedMinor = deliveredCod.reduce(
      (sum, o) =>
        sum + (o.totalAmountMinor || (Number(o.total || 0) * 100) || 0),
      0,
    );
    const inTransitAmountMinor = inTransitCod.reduce(
      (sum, o) =>
        sum + (o.totalAmountMinor || (Number(o.total || 0) * 100) || 0),
      0,
    );

    // Group by courier
    const courierBreakdown = couriers.map((courier) => {
      const courierOrders = deliveredCod.filter(
        (o) =>
          o.courierId === courier.id ||
          String(o.courier || "").toLowerCase() ===
            courier.name.toLowerCase(),
      );
      const collected = courierOrders.reduce(
        (sum, o) =>
          sum + (o.totalAmountMinor || (Number(o.total || 0) * 100) || 0),
        0,
      );
      return {
        id: courier.id,
        name: courier.name,
        orderCount: courierOrders.length,
        collectedMinor: collected,
      };
    });

    return {
      totalCodOrders: codOrders.length,
      deliveredCount: deliveredCod.length,
      inTransitCount: inTransitCod.length,
      returnedCount: returnedCod.length,
      totalCollectedMinor,
      inTransitAmountMinor,
      courierBreakdown,
    };
  }, [orders, couriers]);

  if (!visible) return null;

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
              <Banknote size={20} color={colors.accent} />
              <Text style={styles.headerTitle}>COD Courier Reconciliation</Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={8}>
              <X size={20} color={colors.muted} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.content}>
            <Text style={styles.description}>
              Track Cash on Delivery funds collected by courier partners from completed shipments and funds currently in transit.
            </Text>

            {/* Top summary cards */}
            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>COLLECTED FROM CUSTOMERS</Text>
                <Text style={[styles.statValue, { color: "#10b981" }]}>
                  {formatLkr(codStats.totalCollectedMinor)}
                </Text>
                <Text style={styles.statSub}>
                  {codStats.deliveredCount} delivered orders
                </Text>
              </View>

              <View style={styles.statCard}>
                <Text style={styles.statLabel}>IN TRANSIT / PENDING</Text>
                <Text style={[styles.statValue, { color: colors.accent }]}>
                  {formatLkr(codStats.inTransitAmountMinor)}
                </Text>
                <Text style={styles.statSub}>
                  {codStats.inTransitCount} orders with courier
                </Text>
              </View>
            </View>

            <Text style={styles.listHeader}>Remittance by Courier</Text>

            {codStats.courierBreakdown.length === 0 ? (
              <Text style={styles.emptyText}>No couriers active.</Text>
            ) : (
              codStats.courierBreakdown.map((item) => (
                <View key={item.id} style={styles.courierRow}>
                  <View style={styles.courierIconWrap}>
                    <Truck size={18} color={colors.accent} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.courierName}>{item.name}</Text>
                    <Text style={styles.courierMeta}>
                      {item.orderCount} delivered shipments
                    </Text>
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <Text style={styles.courierAmount}>
                      {formatLkr(item.collectedMinor)}
                    </Text>
                    <Text style={styles.courierStatus}>Remittance Due</Text>
                  </View>
                </View>
              ))
            )}
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
      gap: 14,
    },
    description: {
      fontSize: 13,
      color: colors.muted,
      lineHeight: 18,
    },
    statsGrid: {
      gap: 10,
    },
    statCard: {
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      padding: 14,
      gap: 4,
    },
    statLabel: {
      fontSize: 10,
      fontWeight: "800",
      color: colors.subtle,
      letterSpacing: 0.5,
    },
    statValue: {
      fontSize: 18,
      fontWeight: "800",
    },
    statSub: {
      fontSize: 11,
      color: colors.muted,
    },
    listHeader: {
      fontSize: 13,
      fontWeight: "700",
      color: colors.textStrong,
      textTransform: "uppercase",
      letterSpacing: 0.5,
      marginTop: 6,
    },
    emptyText: {
      fontSize: 13,
      color: colors.muted,
      textAlign: "center",
      paddingVertical: 12,
    },
    courierRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      padding: 14,
      backgroundColor: colors.background,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    courierIconWrap: {
      width: 38,
      height: 38,
      borderRadius: 10,
      backgroundColor: colors.surfaceSoft,
      alignItems: "center",
      justifyContent: "center",
    },
    courierName: {
      fontSize: 14,
      fontWeight: "700",
      color: colors.textStrong,
    },
    courierMeta: {
      fontSize: 11,
      color: colors.muted,
      marginTop: 2,
    },
    courierAmount: {
      fontSize: 14,
      fontWeight: "700",
      color: colors.textStrong,
    },
    courierStatus: {
      fontSize: 10,
      fontWeight: "700",
      color: "#d97706",
      marginTop: 2,
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
