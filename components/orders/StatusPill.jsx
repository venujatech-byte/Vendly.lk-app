import { StyleSheet, Text, View } from "react-native";

import { STATUS_LABELS, STATUS_TONES } from "../../constants/orderStatus";
import { getToneColors } from "../../constants/tones";
import { useAppTheme } from "../../context/ThemeContext";

export default function StatusPill({ status }) {
  const { theme } = useAppTheme();
  const tone = STATUS_TONES[status] ?? "blue";
  const colors = getToneColors(tone, theme);
  const label = STATUS_LABELS[status] ?? status;

  return (
    <View style={[styles.pill, { backgroundColor: colors.background }]}>
      <Text style={[styles.text, { color: colors.icon }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    alignSelf: "flex-start",
  },
  text: {
    fontSize: 12,
    fontWeight: "700",
  },
});
