import { Image } from "expo-image";
import { Package, ShieldCheck } from "lucide-react-native";
import { StyleSheet, Text, View } from "react-native";

import { useAppTheme } from "../../context/ThemeContext";

const CLAIM_TYPE_LABELS = {
  "supplier-warranty": "Supplier warranty",
  "shop-warranty": "Shop warranty",
  "shop-repair": "Shop repair",
};

function formatCurrency(minorUnits = 0) {
  return `LKR ${(minorUnits / 100).toLocaleString("en-LK", {
    minimumFractionDigits: 2,
  })}`;
}

function statusToneColors(status, isDark) {
  const canceled = status === "cancelled" || status === "rejected";
  const active = status === "active" || status === "approved" || status === "in-progress";
  return {
    background: canceled
      ? isDark ? "rgba(239, 68, 68, 0.16)" : "#feecec"
      : active
        ? isDark ? "rgba(245, 158, 11, 0.15)" : "#fff4df"
        : isDark ? "rgba(34, 164, 116, 0.16)" : "#e6f8f1",
    text: canceled
      ? isDark ? "#ff6262" : "#b91c1c"
      : active
        ? isDark ? "#ffad24" : "#b45309"
        : isDark ? "#4bd99d" : "#087a57",
  };
}

export default function WarrantyClaimsList({ claims = [] }) {
  const { colors, theme } = useAppTheme();
  const isDark = theme === "dark";
  const styles = createStyles(colors);

  if (claims.length === 0) {
    return (
      <View style={styles.empty}>
        <ShieldCheck size={28} color={colors.subtle} />
        <Text style={styles.emptyTitle}>No warranty claims recorded</Text>
        <Text style={styles.emptyText}>
          Claims from online orders and physical shop sales appear together here.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.list}>
      {claims.map((claim) => {
        const tone = statusToneColors(claim.status, isDark);

        return (
          <View key={claim.id} style={styles.card}>
            <View style={styles.titleRow}>
              <Text style={styles.claimNumber}>#{claim.claimNumber}</Text>
              <View style={[styles.statusTag, { backgroundColor: tone.background }]}>
                <Text style={[styles.statusText, { color: tone.text }]}>{claim.status}</Text>
              </View>
            </View>

            <Text style={styles.source}>
              {claim.sourceType === "shop-sale" ? "Shop sale" : "Order"}: {claim.sourceNumber}
            </Text>

            <View style={styles.itemRow}>
              {claim.item?.mediaUrl ? (
                <Image
                  source={{ uri: claim.item.mediaUrl }}
                  style={styles.itemImage}
                  contentFit="cover"
                />
              ) : (
                <View style={[styles.itemImage, styles.itemImagePlaceholder]}>
                  <Package size={15} color={colors.subtle} />
                </View>
              )}
              <View style={styles.itemBody}>
                <Text style={styles.itemName} numberOfLines={1}>
                  {claim.item?.name ?? "Product"}
                </Text>
                <Text style={styles.itemMeta}>Qty: {claim.claimQuantity ?? 1}</Text>
              </View>
              <Text style={styles.handling}>
                {CLAIM_TYPE_LABELS[claim.claimType] ?? "Supplier warranty"}
              </Text>
            </View>

            <View style={styles.infoGrid}>
              <View style={styles.infoBlock}>
                <Text style={styles.infoLabel}>Revenue impact</Text>
                <Text style={styles.infoValue}>
                  {claim.revenueImpactMinor ? formatCurrency(claim.revenueImpactMinor) : "No deduction"}
                </Text>
              </View>
              <View style={styles.infoBlock}>
                <Text style={styles.infoLabel}>Customer</Text>
                <Text style={styles.infoValue} numberOfLines={1}>
                  {claim.customerName ?? "—"}
                </Text>
              </View>
              <View style={styles.infoBlock}>
                <Text style={styles.infoLabel}>Date</Text>
                <Text style={styles.infoValue}>
                  {claim.createdAt
                    ? new Date(claim.createdAt).toLocaleDateString("en-LK")
                    : "—"}
                </Text>
              </View>
            </View>

            {claim.reason ? (
              <View style={styles.reasonBox}>
                <Text style={styles.reasonText}>
                  <Text style={styles.reasonStrong}>{claim.reason}</Text>
                  {claim.details ? ` — ${claim.details}` : ""}
                </Text>
              </View>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

function createStyles(colors) {
  return StyleSheet.create({
    list: {
      gap: 10,
    },
    empty: {
      alignItems: "center",
      paddingVertical: 48,
      paddingHorizontal: 20,
      gap: 6,
    },
    emptyTitle: {
      color: colors.textStrong,
      fontSize: 15,
      fontWeight: "700",
      marginTop: 6,
    },
    emptyText: {
      color: colors.muted,
      fontSize: 13,
      textAlign: "center",
      lineHeight: 18,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 12,
      marginBottom: 11,
    },
    titleRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 8,
    },
    claimNumber: {
      color: colors.textStrong,
      fontWeight: "750",
      fontSize: 14.5,
    },
    statusTag: {
      borderRadius: 999,
      paddingHorizontal: 9,
      paddingVertical: 3,
    },
    statusText: {
      fontSize: 11,
      fontWeight: "700",
      textTransform: "capitalize",
    },
    source: {
      color: colors.muted,
      fontSize: 12,
      marginTop: 2,
    },
    itemRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      marginTop: 10,
    },
    itemImage: {
      width: 36,
      height: 36,
      borderRadius: 8,
      backgroundColor: colors.surfaceSoft,
    },
    itemImagePlaceholder: {
      alignItems: "center",
      justifyContent: "center",
    },
    itemBody: {
      flex: 1,
    },
    itemName: {
      color: colors.text,
      fontSize: 13,
      fontWeight: "600",
    },
    itemMeta: {
      color: colors.muted,
      fontSize: 11.5,
    },
    handling: {
      color: colors.accent,
      fontSize: 11,
      fontWeight: "700",
    },
    infoGrid: {
      flexDirection: "row",
      marginTop: 10,
      gap: 10,
    },
    infoBlock: {
      flex: 1,
    },
    infoLabel: {
      color: colors.subtle,
      fontSize: 10,
      fontWeight: "600",
      textTransform: "uppercase",
      letterSpacing: 0.3,
    },
    infoValue: {
      color: colors.text,
      fontSize: 12.5,
      fontWeight: "600",
      marginTop: 2,
    },
    reasonBox: {
      marginTop: 10,
      backgroundColor: colors.surfaceSoft,
      borderRadius: 8,
      padding: 9,
    },
    reasonText: {
      color: colors.muted,
      fontSize: 12,
      lineHeight: 16,
    },
    reasonStrong: {
      color: colors.textStrong,
      fontWeight: "600",
    },
  });
}