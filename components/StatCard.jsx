import { StyleSheet, Text, View } from "react-native";

import { useAppTheme } from "../context/ThemeContext";
import { getToneColors } from "../constants/tones";

// Shared statistic card used by Overview, Couriers, Analytics and Customers —
// mirrors the web app's components/StatCard.jsx + StatCard.css exactly.
export default function StatCard({ label, value, icon: Icon, tone = "blue" }) {
  const { colors, theme } = useAppTheme();
  const toneColors = getToneColors(tone, theme);
  const styles = createStyles(colors);

  return (
    <View style={styles.card}>
      <View style={[styles.icon, { backgroundColor: toneColors.background }]}>
        <Icon size={40} color={toneColors.icon} />
      </View>

      <View style={styles.content}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.value}>{value}</Text>
      </View>
    </View>
  );
}

function createStyles(colors) {
  return StyleSheet.create({
    card: {
      flexGrow: 1,
      flexBasis: "47%",
      minHeight: 82,
      flexDirection: "row",
      alignItems: "center",
      gap: 14,
      padding: 14,
      borderRadius: 8,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    icon: {
      width: 50,
      height: 50,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
    },
    content: {
      flexShrink: 1,
      gap: 2,
    },
    label: {
      color: colors.text,
      fontSize: 14,
      fontWeight: "550",
    },
    value: {
      color: colors.textStrong,
      fontSize: 20,
      fontWeight: "700",
    },
  });
}
