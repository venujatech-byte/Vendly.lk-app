import { StyleSheet, Text, TouchableOpacity } from "react-native";

import { TONE_COLORS } from "../../constants/orderStatus";
import { useAppTheme } from "../../context/ThemeContext";

export default function StatChip({ label, value, tone, isActive, onPress }) {
  const { colors } = useAppTheme();
  const toneColors = TONE_COLORS[tone] ?? TONE_COLORS.blue;
  const styles = createStyles(colors, toneColors, isActive);

  return (
    <TouchableOpacity style={styles.chip} onPress={onPress} activeOpacity={0.7}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </TouchableOpacity>
  );
}

function createStyles(colors, toneColors, isActive) {
  return StyleSheet.create({
    chip: {
      borderRadius: 10,
      borderWidth: isActive ? 2 : 1,
      borderColor: isActive ? colors.accent : colors.border,
      backgroundColor: colors.surface,
      paddingVertical: 8,
      paddingHorizontal: 14,
      marginRight: 8,
      alignItems: "center",
      minWidth: 84,
    },
    label: {
      color: toneColors.icon,
      fontSize: 12,
      fontWeight: "600",
      marginBottom: 2,
    },
    value: {
      color: colors.textStrong,
      fontSize: 16,
      fontWeight: "700",
    },
  });
}
