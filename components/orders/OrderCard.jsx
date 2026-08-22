import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { useAppTheme } from "../../context/ThemeContext";
import StatusPill from "./StatusPill";

export default function OrderCard({ order, onPress }) {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  const itemCount = order.items?.length ?? 0;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.topRow}>
        <Text style={styles.orderNumber} numberOfLines={1}>
          {order.orderNumber ?? order.id}
        </Text>
        <StatusPill status={order.status} />
      </View>

      <Text style={styles.customerName} numberOfLines={1}>
        {order.customerName}
      </Text>

      {order.fraudWarning ? (
        <Text style={styles.fraudWarning}>⚠ Fraud risk match</Text>
      ) : null}

      <View style={styles.bottomRow}>
        <Text style={styles.meta}>
          {itemCount} item{itemCount === 1 ? "" : "s"} · {order.date}
        </Text>
        <Text style={styles.total}>{order.total}</Text>
      </View>
    </TouchableOpacity>
  );
}

function createStyles(colors) {
  return StyleSheet.create({
    card: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 14,
      marginBottom: 10,
      gap: 6,
    },
    topRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    orderNumber: {
      color: colors.textStrong,
      fontWeight: "700",
      fontSize: 14,
      flexShrink: 1,
      marginRight: 8,
    },
    customerName: {
      color: colors.text,
      fontSize: 14,
    },
    fraudWarning: {
      color: colors.danger,
      fontSize: 12,
      fontWeight: "600",
    },
    bottomRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginTop: 4,
    },
    meta: {
      color: colors.muted,
      fontSize: 12,
    },
    total: {
      color: colors.textStrong,
      fontWeight: "700",
      fontSize: 14,
    },
  });
}
