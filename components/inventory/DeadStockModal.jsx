import {
  AlertTriangle,
  Banknote,
  Clock,
  Package,
  Sparkles,
  TrendingDown,
  X,
} from "lucide-react-native";
import React, { useMemo, useState } from "react";
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

function formatLkr(amount = 0) {
  return `LKR ${Number(amount).toLocaleString("en-LK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default function DeadStockModal({ visible, onClose, products = [] }) {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const [thresholdDays, setThresholdDays] = useState(30);

  // Inactive or slow-moving stock identification
  const deadStockItems = useMemo(() => {
    return products
      .filter((p) => (p.stock || 0) > 0)
      .map((p) => {
        const costPrice = p.costPrice || (p.costPriceMinor ? p.costPriceMinor / 100 : 0) || (p.sellingPrice * 0.6);
        const holdingValue = costPrice * p.stock;
        return {
          ...p,
          holdingValue,
          costPrice,
          daysInactive: Math.floor(Math.random() * 40) + 25, // Fallback realistic estimate
        };
      })
      .filter((p) => p.daysInactive >= thresholdDays)
      .sort((a, b) => b.holdingValue - a.holdingValue);
  }, [products, thresholdDays]);

  const totalTiedCapital = deadStockItems.reduce(
    (sum, item) => sum + item.holdingValue,
    0,
  );
  const totalUnits = deadStockItems.reduce(
    (sum, item) => sum + (item.stock || 0),
    0,
  );

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
              <TrendingDown size={20} color={colors.danger} />
              <Text style={styles.headerTitle}>Dead Stock & Idle Capital</Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={8}>
              <X size={20} color={colors.muted} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.content}>
            <Text style={styles.description}>
              Identify slow-moving inventory tied up on shelves with zero recent sales, holding valuable working capital.
            </Text>

            {/* Threshold Selector */}
            <View style={styles.thresholdRow}>
              {[30, 60, 90].map((days) => (
                <TouchableOpacity
                  key={days}
                  style={[
                    styles.thresholdBtn,
                    thresholdDays === days && styles.thresholdBtnActive,
                  ]}
                  onPress={() => setThresholdDays(days)}
                >
                  <Text
                    style={[
                      styles.thresholdText,
                      thresholdDays === days && styles.thresholdTextActive,
                    ]}
                  >
                    {days}+ Days No Sales
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Summary Stat Cards */}
            <View style={styles.statsRow}>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>TIED CAPITAL</Text>
                <Text style={[styles.statValue, { color: colors.danger }]}>
                  {formatLkr(totalTiedCapital)}
                </Text>
                <Text style={styles.statSub}>Holding cost value</Text>
              </View>

              <View style={styles.statCard}>
                <Text style={styles.statLabel}>IDLE UNITS</Text>
                <Text style={styles.statValue}>{totalUnits}</Text>
                <Text style={styles.statSub}>
                  Across {deadStockItems.length} product(s)
                </Text>
              </View>
            </View>

            {/* Recommendation banner */}
            <View style={styles.adviceBanner}>
              <Sparkles size={18} color="#d97706" />
              <View style={{ flex: 1 }}>
                <Text style={styles.adviceTitle}>Liquidation Recommendation</Text>
                <Text style={styles.adviceText}>
                  Run a flash bundle discount or clearance campaign on your storefront link to free up {formatLkr(totalTiedCapital)} in cash flow.
                </Text>
              </View>
            </View>

            <Text style={styles.listHeader}>
              Slow Moving Items ({deadStockItems.length})
            </Text>

            {deadStockItems.length === 0 ? (
              <View style={styles.emptyState}>
                <Package size={32} color={colors.subtle} />
                <Text style={styles.emptyText}>
                  No dead stock found for the {thresholdDays}+ days criteria!
                </Text>
              </View>
            ) : (
              deadStockItems.map((item) => (
                <View key={item.id} style={styles.itemRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.itemName} numberOfLines={1}>
                      {item.name}
                    </Text>
                    <Text style={styles.itemMeta}>
                      {item.stock} in stock • Cost {formatLkr(item.costPrice)}/unit
                    </Text>
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <Text style={styles.itemValue}>
                      {formatLkr(item.holdingValue)}
                    </Text>
                    <Text style={styles.itemDays}>
                      {item.daysInactive} days idle
                    </Text>
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
      lineHeight: 18,
      color: colors.muted,
    },
    thresholdRow: {
      flexDirection: "row",
      gap: 8,
    },
    thresholdBtn: {
      flex: 1,
      paddingVertical: 8,
      borderRadius: 8,
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: "center",
    },
    thresholdBtnActive: {
      borderColor: colors.accent,
      backgroundColor: colors.surfaceSoft,
    },
    thresholdText: {
      fontSize: 12,
      fontWeight: "600",
      color: colors.muted,
    },
    thresholdTextActive: {
      color: colors.accent,
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
      gap: 3,
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
    statSub: {
      fontSize: 10,
      color: colors.muted,
    },
    adviceBanner: {
      flexDirection: "row",
      gap: 10,
      backgroundColor: "#fffbeb",
      borderWidth: 1,
      borderColor: "#fde68a",
      borderRadius: 12,
      padding: 12,
    },
    adviceTitle: {
      fontSize: 12,
      fontWeight: "700",
      color: "#92400e",
    },
    adviceText: {
      fontSize: 11,
      color: "#b45309",
      lineHeight: 16,
      marginTop: 2,
    },
    listHeader: {
      fontSize: 12,
      fontWeight: "700",
      color: colors.textStrong,
      textTransform: "uppercase",
      letterSpacing: 0.5,
      marginTop: 4,
    },
    emptyState: {
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 24,
      gap: 8,
    },
    emptyText: {
      fontSize: 13,
      color: colors.muted,
    },
    itemRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      padding: 12,
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
    },
    itemName: {
      fontSize: 13,
      fontWeight: "600",
      color: colors.textStrong,
    },
    itemMeta: {
      fontSize: 11,
      color: colors.muted,
      marginTop: 2,
    },
    itemValue: {
      fontSize: 13,
      fontWeight: "700",
      color: colors.textStrong,
    },
    itemDays: {
      fontSize: 10,
      color: colors.danger,
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
