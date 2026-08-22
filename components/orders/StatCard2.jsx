import { StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from "react-native";

import { getToneColors } from "../../constants/tones";
import { useAppTheme } from "../../context/ThemeContext";

// Compact statistic card used on the Orders page — mirrors the web app's
// components/StatCard2.jsx + StatCard2.css exactly.
export default function StatCard2({ label, value, icon: Icon, tone = "blue", isActive, onPress }) {
  const { colors, theme } = useAppTheme();
  const toneColors = getToneColors(tone, theme);
  const { width } = useWindowDimensions();
  const cardWidth = Math.max(132, width * 0.44);
  const styles = createStyles(colors, isActive, cardWidth);

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.75}>
      <View style={[styles.icon, { backgroundColor: toneColors.background }]}>
        <Icon size={18} color={toneColors.icon} />
      </View>

      <View style={styles.content}>
        <Text style={styles.label} numberOfLines={1}>
          {label}
        </Text>
        <Text style={styles.value}>{value}</Text>
      </View>
    </TouchableOpacity>
  );
}

function createStyles(colors, isActive, cardWidth) {
  return StyleSheet.create({
    card: {
      width: cardWidth,
      minHeight: 50,
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      padding: 8,
      borderRadius: 15,
      borderWidth: 2,
      borderColor: isActive ? colors.primary : colors.border,
      backgroundColor: colors.surface,
      marginRight: 8,
    },
    icon: {
      width: 32,
      height: 32,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
    },
    content: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 6,
      minWidth: 0,
    },
    label: {
      color: colors.text,
      fontSize: 13,
      fontWeight: "550",
      flexShrink: 1,
    },
    value: {
      color: colors.textStrong,
      fontSize: 16,
      fontWeight: "700",
    },
  });
}
