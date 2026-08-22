import { StyleSheet, Text, View } from "react-native";

import { useAppTheme } from "../context/ThemeContext";
import ScreenHeader from "./ScreenHeader";

export default function ComingSoonScreen({ title, description = null }) {
  const { colors } = useAppTheme();

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader title={title} />

      <View style={styles.body}>
        <Text style={[styles.text, { color: colors.muted }]}>
          {description ?? `${title} is coming soon to the mobile app.`}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  body: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  text: {
    fontSize: 14,
    textAlign: "center",
  },
});
