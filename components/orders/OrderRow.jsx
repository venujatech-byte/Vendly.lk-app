import { Image } from "expo-image";
import { Check, MoreVertical, Package } from "lucide-react-native";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { useAppTheme } from "../../context/ThemeContext";
import StatusPill from "./StatusPill";

const MAX_THUMBNAILS = 3;

export default function OrderRow({
  order,
  isSelected,
  onPress,
  onToggleSelected,
  onOpenActions,
}) {
  const { colors } = useAppTheme();
  const hasWarning = Boolean(order.fraudWarning);
  const styles = createStyles(colors, isSelected, hasWarning);

  const itemCount = order.itemCount ?? order.items?.length ?? 0;
  const thumbnails = (order.items ?? []).slice(0, MAX_THUMBNAILS);

  return (
    <View style={styles.card}>
      <View style={styles.headRow}>
        <TouchableOpacity
          style={styles.checkbox}
          onPress={onToggleSelected}
          hitSlop={8}
        >
          {isSelected ? <Check size={13} color="#ffffff" /> : null}
        </TouchableOpacity>

        <TouchableOpacity style={styles.headMain} onPress={onPress} activeOpacity={0.7}>
          <View style={styles.titleRow}>
            <Text style={styles.orderNumber} numberOfLines={1}>
              #{order.orderNumber}
            </Text>
            <StatusPill status={order.status} />
          </View>

          <Text style={styles.waybill} numberOfLines={1}>
            {order.waybillNumber
              ? `Waybill: ${order.waybillNumber}`
              : "Waybill: not assigned"}
          </Text>

          <Text style={styles.customerName} numberOfLines={1}>
            {order.customerName}
            {order.phoneNumber ? ` · ${order.phoneNumber}` : ""}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.moreButton} onPress={onOpenActions} hitSlop={8}>
          <MoreVertical size={18} color={colors.muted} />
        </TouchableOpacity>
      </View>

      {hasWarning && (
        <Text style={styles.warningText}>⚠ Matches the shared fraud registry</Text>
      )}

      <TouchableOpacity style={styles.bodyRow} onPress={onPress} activeOpacity={0.7}>
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
          <Text style={styles.metaText} numberOfLines={1}>
            {order.courier} · {order.date}
          </Text>
        </View>
      </TouchableOpacity>
    </View>
  );
}

function createStyles(colors, isSelected, hasWarning) {
  return StyleSheet.create({
    card: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      borderWidth: isSelected || hasWarning ? 2 : 1,
      borderColor: isSelected
        ? colors.accent
        : hasWarning
          ? colors.dangerBorder
          : colors.border,
      padding: 12,
      marginBottom: 10,
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
    headMain: {
      flex: 1,
      gap: 3,
    },
    titleRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 8,
    },
    orderNumber: {
      color: colors.textStrong,
      fontWeight: "700",
      fontSize: 14,
      flexShrink: 1,
    },
    waybill: {
      color: colors.subtle,
      fontSize: 11,
      fontWeight: "600",
    },
    customerName: {
      color: colors.muted,
      fontSize: 12,
    },
    moreButton: {
      width: 24,
      alignItems: "center",
      justifyContent: "center",
      paddingTop: 2,
    },
    warningText: {
      color: colors.danger,
      fontSize: 11,
      fontWeight: "600",
      marginTop: 8,
      marginLeft: 30,
    },
    bodyRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 10,
      marginTop: 10,
      marginLeft: 30,
    },
    thumbnails: {
      flexDirection: "row",
      gap: 5,
      flexShrink: 1,
    },
    thumbnail: {
      width: 32,
      height: 32,
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
    },
    thumbnailMoreText: {
      color: colors.muted,
      fontSize: 11,
      fontWeight: "700",
    },
    bodyMeta: {
      alignItems: "flex-end",
      flexShrink: 1,
    },
    total: {
      color: colors.textStrong,
      fontWeight: "700",
      fontSize: 14,
    },
    paidNote: {
      color: colors.success,
      fontSize: 10,
      fontWeight: "600",
      marginTop: 1,
    },
    metaText: {
      color: colors.muted,
      fontSize: 11,
      marginTop: 2,
    },
  });
}
