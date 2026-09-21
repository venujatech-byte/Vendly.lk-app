import { Download, Printer, Share2, X } from "lucide-react-native";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
import {
  printOrderReceipt,
  shareOrderReceiptPdf,
} from "@/services/receiptService";

function formatLkr(minorUnits = 0) {
  return `LKR ${(Number(minorUnits) / 100).toLocaleString("en-LK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default function OrderReceiptModal({
  visible,
  onClose,
  business,
  order,
}) {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const [isWorking, setIsWorking] = useState(false);

  if (!visible || !order) return null;

  const items = order.items || [];
  const storeName = business?.name || "Vendly Store";
  const orderNumber = order.orderNumber || order.id || "N/A";
  const dateStr = order.date || new Date().toLocaleDateString("en-LK");
  const customerName =
    order.customerName || order.customerSnapshot?.name || "Customer";
  const phone = order.phoneNumber || order.customerSnapshot?.phoneNumber || "";

  const subtotalMinor =
    order.subtotalMinor || Number(order.subtotal || 0) * 100 || 0;
  const deliveryMinor =
    order.deliveryFeeMinor || Number(order.deliveryFee || 0) * 100 || 0;
  const discountMinor =
    order.discountTotalMinor || Number(order.discount || 0) * 100 || 0;
  const totalMinor =
    order.totalAmountMinor ||
    order.totalMinor ||
    Number(order.total || 0) * 100 ||
    0;

  async function handlePrint() {
    setIsWorking(true);
    try {
      await printOrderReceipt(business, order);
    } catch (err) {
      Alert.alert("Print Error", err.message || "Failed to print receipt.");
    } finally {
      setIsWorking(false);
    }
  }

  async function handleSharePdf() {
    setIsWorking(true);
    try {
      await shareOrderReceiptPdf(business, order);
    } catch (err) {
      Alert.alert("Share Error", err.message || "Failed to share PDF receipt.");
    } finally {
      setIsWorking(false);
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
            <Text style={styles.headerTitle}>Order Receipt</Text>
            <TouchableOpacity onPress={onClose} hitSlop={8}>
              <X size={20} color={colors.muted} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.content}>
            {/* Visual Receipt Card */}
            <View style={styles.receiptCard}>
              <View style={styles.receiptHeader}>
                <Text style={styles.receiptStore}>{storeName}</Text>
                <View style={styles.receiptBadge}>
                  <Text style={styles.receiptBadgeText}>OFFICIAL RECEIPT</Text>
                </View>
                <Text style={styles.receiptSub}>
                  Order #{orderNumber} • {dateStr}
                </Text>
              </View>

              <View style={styles.divider} />

              <View style={styles.metaRow}>
                <View>
                  <Text style={styles.metaLabel}>CUSTOMER</Text>
                  <Text style={styles.metaValue}>{customerName}</Text>
                  {phone ? <Text style={styles.metaPhone}>{phone}</Text> : null}
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={styles.metaLabel}>PAYMENT</Text>
                  <Text style={styles.metaValue}>
                    {order.paymentMethod === "paid"
                      ? "Fully Paid"
                      : order.paymentMethod === "deposit"
                      ? "Deposit / Due"
                      : "COD"}
                  </Text>
                </View>
              </View>

              <View style={styles.divider} />

              <Text style={styles.itemsHeading}>Purchased Items</Text>
              <View style={styles.itemsList}>
                {items.map((item, idx) => (
                  <View key={idx} style={styles.itemRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.itemName} numberOfLines={1}>
                        {item.name || item.productName || `Item #${idx + 1}`}
                      </Text>
                      <Text style={styles.itemMeta}>
                        {item.size ? `Size: ${item.size} • ` : ""}Qty:{" "}
                        {item.quantity || 1}
                      </Text>
                    </View>
                    <Text style={styles.itemPrice}>
                      {formatLkr(
                        item.lineTotalMinor ||
                          Number(item.sellingPrice || 0) *
                            (item.quantity || 1) *
                            100,
                      )}
                    </Text>
                  </View>
                ))}
              </View>

              <View style={styles.divider} />

              <View style={styles.totalsList}>
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Subtotal</Text>
                  <Text style={styles.totalVal}>{formatLkr(subtotalMinor)}</Text>
                </View>
                {discountMinor > 0 && (
                  <View style={styles.totalRow}>
                    <Text style={[styles.totalLabel, { color: colors.danger }]}>
                      Discount
                    </Text>
                    <Text style={[styles.totalVal, { color: colors.danger }]}>
                      -{formatLkr(discountMinor)}
                    </Text>
                  </View>
                )}
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Delivery Fee</Text>
                  <Text style={styles.totalVal}>{formatLkr(deliveryMinor)}</Text>
                </View>
                <View style={[styles.totalRow, styles.grandTotalRow]}>
                  <Text style={styles.grandTotalLabel}>Total Amount</Text>
                  <Text style={styles.grandTotalVal}>
                    {formatLkr(totalMinor)}
                  </Text>
                </View>
              </View>
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={handlePrint}
              disabled={isWorking}
            >
              <Printer size={16} color={colors.textStrong} />
              <Text style={styles.actionBtnText}>Print</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionBtn, styles.primaryActionBtn]}
              onPress={handleSharePdf}
              disabled={isWorking}
            >
              <Share2 size={16} color="#ffffff" />
              <Text style={[styles.actionBtnText, { color: "#ffffff" }]}>
                Share PDF
              </Text>
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
    headerTitle: {
      fontSize: 16,
      fontWeight: "700",
      color: colors.textStrong,
    },
    content: {
      padding: 18,
    },
    receiptCard: {
      backgroundColor: colors.background,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 18,
      gap: 12,
    },
    receiptHeader: {
      alignItems: "center",
      gap: 4,
    },
    receiptStore: {
      fontSize: 18,
      fontWeight: "800",
      color: colors.textStrong,
    },
    receiptBadge: {
      backgroundColor: colors.surfaceSoft,
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 4,
      marginTop: 2,
    },
    receiptBadgeText: {
      fontSize: 9,
      fontWeight: "800",
      color: colors.accent,
      letterSpacing: 0.5,
    },
    receiptSub: {
      fontSize: 11,
      color: colors.muted,
      marginTop: 2,
    },
    divider: {
      height: 1,
      backgroundColor: colors.border,
      marginVertical: 4,
    },
    metaRow: {
      flexDirection: "row",
      justifyContent: "space-between",
    },
    metaLabel: {
      fontSize: 10,
      fontWeight: "800",
      color: colors.subtle,
      letterSpacing: 0.5,
    },
    metaValue: {
      fontSize: 13,
      fontWeight: "700",
      color: colors.textStrong,
      marginTop: 2,
    },
    metaPhone: {
      fontSize: 11,
      color: colors.muted,
    },
    itemsHeading: {
      fontSize: 11,
      fontWeight: "800",
      color: colors.subtle,
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    itemsList: {
      gap: 8,
    },
    itemRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    itemName: {
      fontSize: 13,
      fontWeight: "600",
      color: colors.textStrong,
    },
    itemMeta: {
      fontSize: 11,
      color: colors.muted,
    },
    itemPrice: {
      fontSize: 13,
      fontWeight: "700",
      color: colors.textStrong,
    },
    totalsList: {
      gap: 6,
    },
    totalRow: {
      flexDirection: "row",
      justifyContent: "space-between",
    },
    totalLabel: {
      fontSize: 12,
      color: colors.muted,
    },
    totalVal: {
      fontSize: 12,
      fontWeight: "600",
      color: colors.textStrong,
    },
    grandTotalRow: {
      paddingTop: 8,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      marginTop: 4,
    },
    grandTotalLabel: {
      fontSize: 15,
      fontWeight: "800",
      color: colors.textStrong,
    },
    grandTotalVal: {
      fontSize: 15,
      fontWeight: "800",
      color: colors.accent,
    },
    footer: {
      flexDirection: "row",
      gap: 12,
      paddingHorizontal: 18,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    actionBtn: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      paddingVertical: 12,
      borderRadius: 10,
      backgroundColor: colors.surfaceSoft,
      borderWidth: 1,
      borderColor: colors.border,
    },
    primaryActionBtn: {
      backgroundColor: colors.accent,
      borderColor: colors.accent,
    },
    actionBtnText: {
      fontSize: 13,
      fontWeight: "700",
      color: colors.textStrong,
    },
  });
}
