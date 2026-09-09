import { Image } from "expo-image";
import { ChevronDown, MoreVertical, Package, User } from "lucide-react-native";
import { useState } from "react";
import { Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { useAppTheme } from "../../context/ThemeContext";

const MAX_THUMBNAILS = 3;

export default function ShopSaleCard({
  sale,
  onRemove,
  onWarrantyClaim,
}) {
  const { colors, theme } = useAppTheme();
  const styles = createStyles(colors, theme);
  const [isExpanded, setIsExpanded] = useState(false);

  const itemCount = sale.itemCount ?? sale.items?.length ?? 0;
  const thumbnails = (sale.items ?? []).slice(0, MAX_THUMBNAILS);
  const hasActiveWarranty = (sale.items ?? []).some(
    (item) => item.warrantyExpiresAt && new Date(item.warrantyExpiresAt) >= new Date(),
  );

  function openActions() {
    const buttons = [];

    if (hasActiveWarranty) {
      buttons.push({
        text: "Warranty claim",
        onPress: () => onWarrantyClaim?.(sale),
      });
    }

    buttons.push({
      text: "Delete sale",
      style: "destructive",
      onPress: () => {
        Alert.alert(
          "Delete shop sale?",
          `Deleting #${sale.saleNumber} restores every sold item to inventory. This is recorded in stock history.`,
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Delete",
              style: "destructive",
              onPress: () => onRemove?.(sale),
            },
          ],
        );
      },
    });

    Alert.alert(`#${sale.saleNumber}`, "Sale actions", buttons);
  }

  return (
    <View style={styles.card}>
      <View style={styles.headRow}>
        <TouchableOpacity
          style={styles.cardMain}
          onPress={() => setIsExpanded((current) => !current)}
          activeOpacity={0.7}
        >
          <View style={styles.titleRow}>
            <Text style={styles.saleNumber} numberOfLines={1}>
              #{sale.saleNumber}
            </Text>
            <View style={styles.badgesRow}>
              <Text style={styles.paymentTag}>{sale.paymentMethod ?? "cash"}</Text>
              <Text style={styles.total}>{sale.total}</Text>
            </View>
          </View>

          <View style={styles.customerRow}>
            <User size={12} color={colors.muted} />
            <Text style={styles.customerName} numberOfLines={1}>
              {sale.customerName || "Walk-in customer"}
            </Text>
            {sale.phoneNumber ? (
              <Text style={styles.customerPhone}>· {sale.phoneNumber}</Text>
            ) : null}
          </View>

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
                    <Package size={14} color={colors.subtle} />
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

              <Text style={styles.itemsCount}>
                {itemCount} {itemCount === 1 ? "item" : "items"}
              </Text>
            </View>

            <View style={styles.dateWrap}>
              <Text style={styles.dateText}>
                {sale.date} {sale.time}
              </Text>
              <ChevronDown
                size={13}
                color={colors.subtle}
                style={{ transform: [{ rotate: isExpanded ? "0deg" : "-90deg" }] }}
              />
            </View>
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.moreButton} onPress={openActions} hitSlop={8}>
          <MoreVertical size={18} color={colors.muted} />
        </TouchableOpacity>
      </View>

      {isExpanded && (
        <View style={styles.details}>
          <View style={styles.detailsSection}>
            <Text style={styles.detailsTitle}>Items sold</Text>
            {(sale.items ?? []).map((item) => (
              <View key={item.id} style={styles.detailItemRow}>
                <Text style={styles.detailItemName} numberOfLines={1}>
                  {item.name}
                  {item.size ? ` · ${item.size}` : ""} × {item.quantity}
                </Text>
                {item.warrantyExpiresAt &&
                  new Date(item.warrantyExpiresAt) >= new Date() && (
                    <Text style={styles.warrantyTag}>Warranty active</Text>
                  )}
                <Text style={styles.detailItemPrice}>{item.price}</Text>
              </View>
            ))}
          </View>

          {sale.note ? (
            <View style={styles.detailsSection}>
              <Text style={styles.detailsTitle}>Note</Text>
              <Text style={styles.noteText}>{sale.note}</Text>
            </View>
          ) : null}
        </View>
      )}
    </View>
  );
}

function createStyles(colors, theme) {
  const isDark = theme === "dark";

  return StyleSheet.create({
    card: {
      backgroundColor: colors.surface,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
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
    cardMain: {
      flex: 1,
      gap: 5,
    },
    titleRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 6,
      flexWrap: "wrap",
    },
    saleNumber: {
      color: colors.textStrong,
      fontWeight: "750",
      fontSize: 14.5,
    },
    badgesRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    paymentTag: {
      color: colors.muted,
      fontSize: 10,
      fontWeight: "700",
      textTransform: "uppercase",
      letterSpacing: 0.3,
      backgroundColor: colors.surfaceSoft,
      borderRadius: 6,
      paddingHorizontal: 7,
      paddingVertical: 2.5,
    },
    total: {
      color: colors.textStrong,
      fontWeight: "800",
      fontSize: 14.5,
    },
    customerRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
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
      backgroundColor: colors.surfaceSoft,
    },
    thumbnailMoreText: {
      color: colors.muted,
      fontSize: 10,
      fontWeight: "750",
    },
    itemsCount: {
      color: colors.text,
      fontSize: 11.5,
      fontWeight: "600",
      marginLeft: 4,
    },
    dateWrap: {
      flexDirection: "row",
      alignItems: "center",
      gap: 3,
    },
    dateText: {
      color: colors.subtle,
      fontSize: 10,
    },
    details: {
      marginTop: 10,
      paddingTop: 10,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      gap: 10,
    },
    detailsSection: {
      gap: 6,
    },
    detailsTitle: {
      color: colors.textStrong,
      fontSize: 12,
      fontWeight: "700",
    },
    detailItemRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    detailItemName: {
      flex: 1,
      color: colors.text,
      fontSize: 12.5,
    },
    warrantyTag: {
      color: colors.success,
      fontSize: 10,
      fontWeight: "700",
    },
    detailItemPrice: {
      color: colors.textStrong,
      fontSize: 12.5,
      fontWeight: "700",
    },
    noteText: {
      color: colors.muted,
      fontSize: 12.5,
      lineHeight: 17,
    },
  });
}