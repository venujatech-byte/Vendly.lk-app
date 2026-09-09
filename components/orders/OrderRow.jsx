import { Image } from "expo-image";
import {
  Check,
  MapPin,
  MoreVertical,
  Package,
  StickyNote,
  Truck,
} from "lucide-react-native";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { useAppTheme } from "../../context/ThemeContext";
import PaymentBadge from "./PaymentBadge";
import StatusPill from "./StatusPill";

const MAX_THUMBNAILS = 3;

export default function OrderRow({
  order,
  isSelected,
  onPress,
  onToggleSelected,
  onOpenActions,
}) {
  const { colors, theme } = useAppTheme();
  const hasWarning = Boolean(order.fraudWarning);
  const styles = createStyles(colors, isSelected, hasWarning, theme);

  const itemCount = order.itemCount ?? order.items?.length ?? 0;
  const thumbnails = (order.items ?? []).slice(0, MAX_THUMBNAILS);
  const note = order.privateNote || order.note;

  return (
    <View style={styles.card}>
      {/* Top Header Row with Selection Checkbox and More Menu */}
      <View style={styles.headRow}>
        <TouchableOpacity
          style={styles.checkbox}
          onPress={onToggleSelected}
          hitSlop={8}
        >
          {isSelected ? <Check size={13} color="#ffffff" /> : null}
        </TouchableOpacity>

        {/* Main Body Area: Tapping opens Order Details */}
        <TouchableOpacity
          style={styles.cardMainClickable}
          onPress={onPress}
          onLongPress={onOpenActions}
          activeOpacity={0.7}
        >
          {/* Title Row */}
          <View style={styles.titleRow}>
            <Text style={styles.orderNumber} numberOfLines={1}>
              #{order.orderNumber}
            </Text>
            <View style={styles.badgesRow}>
              <PaymentBadge
                paymentMethod={order.paymentMethod}
                paymentStatus={order.paymentStatus}
                depositAmount={order.deposit}
                paidAmountMinor={order.paidAmountMinor}
              />
              <StatusPill status={order.status} />
            </View>
          </View>

          {/* Meta & Courier Row */}
          <View style={styles.metaInfoRow}>
            <Text style={styles.waybill} numberOfLines={1}>
              {order.waybillNumber
                ? `Waybill: ${order.waybillNumber}`
                : "Waybill: not assigned"}
            </Text>
            {order.courier ? (
              <View style={styles.courierBadge}>
                <Truck size={11} color={colors.muted} />
                <Text style={styles.courierText} numberOfLines={1}>
                  {order.courier}
                </Text>
              </View>
            ) : null}
          </View>

          {/* Customer info */}
          <View style={styles.customerRow}>
            <Text style={styles.customerName} numberOfLines={1}>
              {order.customerName}
            </Text>
            {order.phoneNumber ? (
              <Text style={styles.customerPhone}>· {order.phoneNumber}</Text>
            ) : null}
          </View>

          {/* Fraud Warning Banner */}
          {hasWarning && (
            <View style={styles.warningBox}>
              <Text style={styles.warningText}>⚠ Matches shared fraud registry</Text>
            </View>
          )}

          {/* Private Notes Preview */}
          {note ? (
            <View style={styles.noteBox}>
              <StickyNote size={13} color={theme === "dark" ? "#fcd34d" : "#92400e"} />
              <Text style={styles.noteText} numberOfLines={2}>
                {note}
              </Text>
            </View>
          ) : null}

          {/* Delivery Address Preview */}
          {order.deliveryAddress ? (
            <View style={styles.addressBox}>
              <MapPin size={12} color={colors.subtle} />
              <Text style={styles.addressText} numberOfLines={1}>
                {order.deliveryAddress}
              </Text>
            </View>
          ) : null}

          {/* Thumbnails and Amount */}
          <View style={styles.bodyRow}>
            <View style={styles.thumbnails}>
              {thumbnails.map((item, index) =>
                item.imageUrl ? (
                  <Image
                    key={item.id ?? index}
                    source={{ uri: item.imageUrl }}
                    style={styles.thumbnail}
                    contentFit="cover"
                  />
                ) : (
                  <View
                    key={item.id ?? index}
                    style={[styles.thumbnail, styles.thumbnailPlaceholder]}
                  >
                    <Package size={15} color={colors.subtle} />
                  </View>
                ),
              )}

              {itemCount > MAX_THUMBNAILS && (
                <View style={[styles.thumbnail, styles.thumbnailMore]}>
                  <Text style={styles.thumbnailMoreText}>
                    +{itemCount - MAX_THUMBNAILS}
                  </Text>
                </View>
              )}

              <View style={styles.itemsSummary}>
                <Text style={styles.itemsCountText}>{itemCount} {itemCount === 1 ? "item" : "items"}</Text>
                <Text style={styles.dateText}>{order.date}</Text>
              </View>
            </View>

            <View style={styles.bodyMeta}>
              <Text style={styles.total}>
                {order.paidAmountMinor > 0 ? order.balanceDue : order.total}
              </Text>
              {order.paidAmountMinor > 0 ? (
                <Text style={styles.paidNote} numberOfLines={1}>
                  {order.total} · {order.paidAmount} paid
                </Text>
              ) : null}
            </View>
          </View>
        </TouchableOpacity>

        {/* More Actions Menu Button */}
        <TouchableOpacity style={styles.moreButton} onPress={onOpenActions} hitSlop={8}>
          <MoreVertical size={18} color={colors.muted} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

function createStyles(colors, isSelected, hasWarning, theme) {
  const isDark = theme === "dark";

  return StyleSheet.create({
    card: {
      backgroundColor: colors.surface,
      borderRadius: 14,
      borderWidth: isSelected || hasWarning ? 2 : 1,
      borderColor: isSelected
        ? colors.accent
        : hasWarning
          ? colors.dangerBorder
          : colors.border,
      padding: 12,
      marginBottom: 11,
      shadowColor: "#082f52",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDark ? 0.25 : 0.04,
      shadowRadius: 6,
      elevation: 2,
    },
    headRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 10,
    },
    checkbox: {
      width: 20,
      height: 20,
      borderRadius: 5,
      borderWidth: 2,
      borderColor: isSelected ? colors.accent : colors.border,
      backgroundColor: isSelected ? colors.accent : "transparent",
      alignItems: "center",
      justifyContent: "center",
      marginTop: 2,
    },
    cardMainClickable: {
      flex: 1,
      gap: 6,
    },
    titleRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 6,
      flexWrap: "wrap",
    },
    orderNumber: {
      color: colors.textStrong,
      fontWeight: "750",
      fontSize: 14.5,
    },
    badgesRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
    },
    metaInfoRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      flexWrap: "wrap",
      marginTop: 1,
    },
    waybill: {
      color: colors.subtle,
      fontSize: 11,
      fontWeight: "600",
    },
    courierBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 3,
      backgroundColor: colors.surfaceSoft,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
    },
    courierText: {
      color: colors.muted,
      fontSize: 10.5,
      fontWeight: "600",
    },
    customerRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      marginTop: 1,
    },
    customerName: {
      color: colors.textStrong,
      fontSize: 12.5,
      fontWeight: "600",
    },
    customerPhone: {
      color: colors.muted,
      fontSize: 12,
    },
    moreButton: {
      width: 28,
      alignItems: "center",
      justifyContent: "center",
      paddingTop: 2,
    },

    /* Warning Box */
    warningBox: {
      backgroundColor: colors.dangerBackground,
      borderWidth: 1,
      borderColor: colors.dangerBorder,
      borderRadius: 7,
      paddingHorizontal: 9,
      paddingVertical: 4,
      marginTop: 2,
    },
    warningText: {
      color: colors.danger,
      fontSize: 11,
      fontWeight: "600",
    },

    /* Note Box */
    noteBox: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 6,
      backgroundColor: isDark ? "rgba(245, 158, 11, 0.12)" : "#fffbf0",
      borderWidth: 1,
      borderColor: isDark ? "rgba(245, 158, 11, 0.25)" : "#fce7b0",
      borderRadius: 8,
      paddingHorizontal: 9,
      paddingVertical: 6,
      marginTop: 2,
    },
    noteText: {
      flex: 1,
      color: isDark ? "#fcd34d" : "#92400e",
      fontSize: 11,
      lineHeight: 15,
      fontWeight: "500",
    },

    /* Address Box */
    addressBox: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      marginTop: 1,
    },
    addressText: {
      flex: 1,
      color: colors.muted,
      fontSize: 11,
    },

    /* Middle Row */
    bodyRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 10,
      paddingTop: 4,
    },
    thumbnails: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      flexShrink: 1,
    },
    thumbnail: {
      width: 34,
      height: 34,
      borderRadius: 7,
      backgroundColor: colors.surfaceSoft,
    },
    thumbnailPlaceholder: {
      alignItems: "center",
      justifyContent: "center",
    },
    thumbnailMore: {
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.surfaceSoft,
    },
    thumbnailMoreText: {
      color: colors.muted,
      fontSize: 11,
      fontWeight: "750",
    },
    itemsSummary: {
      marginLeft: 4,
      gap: 1,
    },
    itemsCountText: {
      color: colors.text,
      fontSize: 11.5,
      fontWeight: "600",
    },
    dateText: {
      color: colors.subtle,
      fontSize: 10,
    },
    bodyMeta: {
      alignItems: "flex-end",
      flexShrink: 1,
    },
    total: {
      color: colors.textStrong,
      fontWeight: "800",
      fontSize: 14.5,
    },
    paidNote: {
      color: colors.success,
      fontSize: 10,
      fontWeight: "600",
      marginTop: 1,
    },
  });
}
